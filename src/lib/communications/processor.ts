import "server-only";
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailOutbox, emailSuppressions } from "@/lib/db/schema/communications";
import {
  evaluateWorkerConfiguration,
  developmentRecipientAllowed,
  normalizeMailbox,
  type Environment,
} from "./config";
import {
  renderCommunicationEmail,
  type CommunicationEmailInput,
} from "./email";
import {
  providerRequestSchema,
  sendProviderRequest,
  type ProviderRequest,
} from "./provider";
import { resolveEmailRecipient } from "./recipients";
import { communicationEvents } from "./registry";
import {
  deliveryTransition,
  recoveryFailure,
  workerLimits,
  type DeliveryResult,
} from "./worker-policy";
import { runEmailBatch } from "./worker";

type OutboxRow = typeof emailOutbox.$inferSelect;
type ClaimedRow = OutboxRow & { recoveryError: string | null };
type Database = ReturnType<typeof getDb>;
type DeliveryDependencies = {
  db: Database;
  env: Environment;
  resolve: typeof resolveEmailRecipient;
  send: typeof sendProviderRequest;
};

function leaseCondition(row: OutboxRow) {
  return and(
    eq(emailOutbox.id, row.id),
    eq(emailOutbox.status, "PROCESSING"),
    eq(emailOutbox.processingStartedAt, row.processingStartedAt!),
  );
}

export async function claimNextEmail(
  now: Date,
  db: Database = getDb(),
): Promise<ClaimedRow | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '5000'`);
    await tx.execute(sql`set local lock_timeout = '1000'`);
    const candidate = (
      await tx
        .select()
        .from(emailOutbox)
        .where(
          or(
            and(
              inArray(emailOutbox.status, ["PENDING", "RETRY"]),
              lte(emailOutbox.availableAt, now),
            ),
            and(
              eq(emailOutbox.status, "PROCESSING"),
              or(
                lt(
                  emailOutbox.processingStartedAt,
                  new Date(now.getTime() - workerLimits.leaseMs),
                ),
                and(
                  isNull(emailOutbox.processingStartedAt),
                  lt(
                    emailOutbox.updatedAt,
                    new Date(now.getTime() - workerLimits.leaseMs),
                  ),
                ),
              ),
            ),
          ),
        )
        .orderBy(
          asc(emailOutbox.availableAt),
          asc(emailOutbox.createdAt),
          asc(emailOutbox.id),
        )
        .limit(1)
        .for("update", { skipLocked: true })
    )[0];
    if (!candidate) return null;
    const recoveryError = recoveryFailure(candidate, now);
    const claimed = (
      await tx
        .update(emailOutbox)
        .set({
          status: "PROCESSING",
          processingStartedAt: now,
          lastAttemptAt: now,
          updatedAt: now,
          attemptCount: String(
            recoveryError
              ? Number(candidate.attemptCount) || 0
              : Number(candidate.attemptCount) + 1,
          ),
        })
        .where(eq(emailOutbox.id, candidate.id))
        .returning()
    )[0];
    return { ...claimed, recoveryError };
  });
}

async function suppressed(address: string, db: Database) {
  return Boolean(
    (
      await db
        .select({ id: emailSuppressions.id })
        .from(emailSuppressions)
        .where(
          and(
            eq(emailSuppressions.normalizedEmail, address),
            isNull(emailSuppressions.clearedAt),
          ),
        )
        .limit(1)
    )[0],
  );
}

async function freezeRequest(
  record: OutboxRow,
  { db, env, resolve }: DeliveryDependencies,
): Promise<ProviderRequest | DeliveryResult> {
  if (record.providerRequest) {
    const existing = providerRequestSchema.safeParse(record.providerRequest);
    if (!existing.success || existing.data.to[0] !== record.recipientEmail)
      return { kind: "permanent", code: "INVALID_EMAIL_REQUEST" };
    return existing.data;
  }
  const resolved = record.recipientEmail
    ? { ok: true as const, email: record.recipientEmail }
    : await resolve({
        type: record.recipientType as "CLIENT" | "STAFF" | "PRE_ACCOUNT",
        reference: record.recipientReference,
      });
  if (!resolved.ok)
    return {
      kind: resolved.retryable ? "temporary" : "permanent",
      code: resolved.code,
    };
  const recipient = normalizeMailbox(resolved.email);
  if (!recipient) return { kind: "permanent", code: "RECIPIENT_INVALID" };
  if (!developmentRecipientAllowed(recipient, env))
    return { kind: "permanent", code: "DEVELOPMENT_RECIPIENT_BLOCKED" };
  if (await suppressed(recipient, db))
    return { kind: "permanent", code: "RECIPIENT_SUPPRESSED" };
  if (!Object.hasOwn(communicationEvents, record.eventKey))
    return { kind: "permanent", code: "INVALID_EMAIL_REQUEST" };
  let request: ProviderRequest;
  try {
    const message = await renderCommunicationEmail({
      event: record.eventKey,
      payload: record.payload,
    } as CommunicationEmailInput);
    request = providerRequestSchema.parse({
      from: env.CLAIMS_BRIDGE_FROM_EMAIL,
      to: [recipient],
      ...(env.CLAIMS_BRIDGE_REPLY_TO_EMAIL
        ? { reply_to: env.CLAIMS_BRIDGE_REPLY_TO_EMAIL }
        : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  } catch {
    return { kind: "permanent", code: "INVALID_EMAIL_REQUEST" };
  }
  // The address and exact body become durable BEFORE any provider attempt.
  const saved = await db
    .update(emailOutbox)
    .set({
      recipientEmail: recipient,
      providerRequest: request,
      providerFirstAttemptAt: new Date(),
      updatedAt: new Date(),
    })
    .where(leaseCondition(record))
    .returning({ id: emailOutbox.id });
  return saved.length
    ? request
    : { kind: "permanent", code: "PROCESSING_LEASE_LOST" };
}

async function deliverClaimedEmail(
  record: ClaimedRow,
  dependencies: DeliveryDependencies,
): Promise<DeliveryResult> {
  if (record.recoveryError)
    return { kind: "permanent", code: record.recoveryError };
  const request = await freezeRequest(record, dependencies);
  if ("kind" in request) return request;
  // Recheck even for frozen retries; neither automatic nor manual retry bypasses suppression.
  if (await suppressed(request.to[0], dependencies.db))
    return { kind: "permanent", code: "RECIPIENT_SUPPRESSED" };
  const ownsLease = (
    await dependencies.db
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(leaseCondition(record))
      .limit(1)
  )[0];
  if (
    !ownsLease ||
    Date.now() - record.processingStartedAt!.getTime() >=
      workerLimits.leaseMs - workerLimits.providerTimeoutMs
  )
    return { kind: "temporary", code: "PROCESSING_LEASE_LOST" };
  return dependencies.send(record.emailReference, request, dependencies.env);
}

/** Dependencies allow isolated database/provider tests; no browser can supply them. */
export function createEmailWorker(dependencies: DeliveryDependencies) {
  return {
    enabled: () => evaluateWorkerConfiguration(dependencies.env).canProcess,
    now: () => new Date(),
    claim: (now: Date) => claimNextEmail(now, dependencies.db),
    deliver: (record: ClaimedRow) => deliverClaimedEmail(record, dependencies),
    finish: async (record: ClaimedRow, result: DeliveryResult, now: Date) => {
      const updated = await dependencies.db
        .update(emailOutbox)
        .set(deliveryTransition(result, Number(record.attemptCount), now))
        .where(leaseCondition(record))
        .returning({ id: emailOutbox.id });
      return updated.length === 1;
    },
  };
}

export async function processEmailBatch(batchSize?: number) {
  if (!evaluateWorkerConfiguration(process.env).canProcess)
    return {
      processed: 0,
      accepted: 0,
      attention: 0,
      leaseLost: 0,
      inactive: true,
    };
  return runEmailBatch(
    createEmailWorker({
      db: getDb(),
      env: process.env,
      resolve: resolveEmailRecipient,
      send: sendProviderRequest,
    }),
    batchSize,
  );
}
