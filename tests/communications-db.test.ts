import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import * as leadSchema from "../src/lib/db/schema/leads";
import {
  emailOutbox,
  emailDeliveryEvents,
  emailSuppressions,
} from "../src/lib/db/schema/communications";
import { buildEmailOutboxValues } from "../src/lib/communications/email";
import {
  claimNextEmail,
  createEmailWorker,
} from "../src/lib/communications/processor";
import { runEmailBatch } from "../src/lib/communications/worker";
import { recordResendDeliveryEvent } from "../src/lib/communications/webhook";
import type { ProviderRequest } from "../src/lib/communications/provider";
import { triggerCommunicationInTransaction } from "../src/lib/communications/manual-service";
import { upsertClientProfile } from "../src/lib/clients/repository";
import { profileSchema } from "../src/lib/clients/validation";

test("Development PostgreSQL communications integration — isolated schema, fabricated recipients, no provider", async (t) => {
  loadEnvConfig(process.cwd(), true);
  assert.ok(
    process.env.CLERK_SECRET_KEY?.startsWith("sk_test_") &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
    "Development identity configuration required",
  );
  assert.notEqual(process.env.VERCEL_ENV, "production");
  const source = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  source.on("error", () => undefined);
  const namespace = `qa_communications_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  assert.match(namespace, /^qa_communications_[a-f0-9]{16}$/);
  let created = false;
  let pool: Pool | undefined;
  try {
    const ledger = await source.query(
      "select count(*)::int as count from drizzle.__drizzle_migrations",
    );
    assert.equal(
      ledger.rows[0].count,
      27,
      "Expected the Development migration baseline; refusing other databases",
    );
    await source.query(`CREATE SCHEMA "${namespace}"`);
    created = true;
    for (const table of [
      "email_outbox",
      "email_delivery_events",
      "email_suppressions",
      "client_profiles",
      "staff_users",
      "staff_audit_events",
      "eligibility_assessments",
      "claims",
      "claim_timeline_events",
      "claim_action_requirements",
      "claim_evidence_requirements",
      "client_notifications",
      "client_notification_preferences",
      "staff_notifications",
      "staff_notification_preferences",
      "eligibility_leads",
      "pre_account_eligibility_assessments",
      "eligibility_lead_conversion_tokens",
    ] as const) {
      await source.query(
        `CREATE TABLE "${namespace}"."${table}" (LIKE public."${table}" INCLUDING ALL)`,
      );
    }
    // Session-isolated search_path requires the same Neon branch's direct endpoint, not PgBouncer.
    const directUrl = new URL(process.env.DATABASE_URL!);
    assert.ok(
      directUrl.hostname.endsWith(".neon.tech"),
      "Expected configured Development Neon branch",
    );
    directUrl.hostname = directUrl.hostname.replace("-pooler.", ".");
    pool = new Pool({
      connectionString: directUrl.href,
      options: `-c search_path=${namespace} -c statement_timeout=15000 -c lock_timeout=10000`,
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    pool.on("error", () => undefined);
    const db = drizzle(pool, { schema });
    assert.equal(
      (await pool.query("select current_schema() as name")).rows[0].name,
      namespace,
    );
    const env = {
      NODE_ENV: "development",
      RESEND_API_KEY: "fabricated-key-not-used",
      CLAIMS_BRIDGE_FROM_EMAIL: "Claims Bridge <sender@example.invalid>",
      NEXT_PUBLIC_SITE_URL: "https://example.invalid",
      COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST:
        "developer@example.invalid,new@example.invalid",
    };
    const accepted = new Map<string, { body: string; id: string }>();
    let providerCalls = 0;
    let resolutions = 0;
    const worker = createEmailWorker({
      db,
      env,
      resolve: async () => {
        resolutions++;
        return {
          ok: true,
          email: "new@example.invalid",
          source: "CLERK_PRIMARY_VERIFIED",
        };
      },
      send: async (reference, request: ProviderRequest) => {
        providerCalls++;
        const body = JSON.stringify(request);
        const prior = accepted.get(reference);
        if (prior) {
          assert.equal(
            body,
            prior.body,
            "Idempotency replay must preserve exact request",
          );
          return { kind: "sent", id: prior.id };
        }
        const id = randomUUID();
        accepted.set(reference, { body, id });
        return { kind: "sent", id };
      },
    });
    const queue = async (deferred = false) =>
      (
        await db
          .insert(emailOutbox)
          .values(
            buildEmailOutboxValues({
              event: "WELCOME",
              recipient: deferred
                ? {
                    mode: "DEFERRED",
                    recipientType: "CLIENT",
                    recipientReference: "CB-CLI-FABRICATED",
                  }
                : {
                    mode: "SNAPSHOT",
                    recipientType: "PRE_ACCOUNT",
                    recipientReference: "CB-LEAD-FABRICATED",
                    email: "developer@example.invalid",
                  },
              payload: { firstName: "Fabricated developer" },
              dedupeKey: `QA:${randomUUID()}`,
            }),
          )
          .returning()
      )[0];
    const read = async (id: string) =>
      (await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)))[0];
    const first = await queue();

    await t.test(
      "concurrent actual workers accept one pending row once",
      async () => {
        await Promise.all([runEmailBatch(worker, 1), runEmailBatch(worker, 1)]);
        assert.equal(providerCalls, 1);
        const row = await read(first.id);
        assert.equal(row.status, "SENT");
        assert.equal(row.attemptCount, "1");
        assert.equal(row.recipientEmail, "developer@example.invalid");
        assert.ok(row.providerRequest && row.providerFirstAttemptAt);
        assert.equal(resolutions, 0);
      },
    );

    await t.test(
      "crash recovery reuses the frozen body, recipient, key and provider ID",
      async () => {
        const sent = await read(first.id);
        await db
          .update(emailOutbox)
          .set({
            status: "PROCESSING",
            providerMessageId: null,
            sentAt: null,
            processingStartedAt: new Date(Date.now() - 600000),
          })
          .where(eq(emailOutbox.id, first.id));
        env.CLAIMS_BRIDGE_FROM_EMAIL =
          "Changed sender <changed@example.invalid>";
        await runEmailBatch(worker, 1);
        const recovered = await read(first.id);
        assert.equal(accepted.size, 1);
        assert.equal(recovered.providerMessageId, sent.providerMessageId);
        assert.deepEqual(recovered.providerRequest, sent.providerRequest);
        assert.deepEqual(recovered.payload, sent.payload);
        assert.equal(recovered.templateKey, sent.templateKey);
        assert.equal(recovered.dedupeKey, sent.dedupeKey);
        assert.equal(resolutions, 0);
      },
    );

    await t.test(
      "recent leases cannot be reclaimed; a stale worker cannot finish a replacement lease",
      async () => {
        const pending = await queue();
        const old = await claimNextEmail(new Date(), db);
        assert.equal(old?.id, pending.id);
        assert.equal(await claimNextEmail(new Date(), db), null);
        await db
          .update(emailOutbox)
          .set({ processingStartedAt: new Date(Date.now() - 600000) })
          .where(eq(emailOutbox.id, pending.id));
        const replacement = await claimNextEmail(new Date(), db);
        assert.equal(replacement?.id, pending.id);
        assert.equal(
          await worker.finish(
            old!,
            { kind: "sent", id: randomUUID() },
            new Date(),
          ),
          false,
        );
        assert.equal(
          await worker.finish(
            replacement!,
            { kind: "permanent", code: "RECIPIENT_INVALID" },
            new Date(),
          ),
          true,
        );
      },
    );

    const providerId = (await read(first.id)).providerMessageId!;
    await t.test(
      "concurrent webhook replay creates one ledger event and one suppression",
      async () => {
        const id = `msg_${randomUUID()}`;
        const event = {
          type: "email.bounced",
          created_at: new Date().toISOString(),
          data: { email_id: providerId },
        };
        await Promise.all([
          recordResendDeliveryEvent(id, event, db),
          recordResendDeliveryEvent(id, event, db),
        ]);
        assert.equal(
          (
            await db
              .select()
              .from(emailDeliveryEvents)
              .where(eq(emailDeliveryEvents.providerEventId, id))
          ).length,
          1,
        );
        assert.equal((await db.select().from(emailSuppressions)).length, 1);
        assert.equal((await read(first.id)).lastErrorCode, "email.bounced");
        await recordResendDeliveryEvent(
          `msg_${randomUUID()}`,
          { ...event, type: "email.delivered" },
          db,
        );
        assert.equal((await read(first.id)).status, "FAILED");
      },
    );

    await t.test(
      "suppression failure rolls back the ledger, so replay can complete the same event",
      async () => {
        await db.execute(
          sql`alter table email_suppressions add constraint qa_fail_complaint check (reason <> 'email.complained')`,
        );
        const id = `msg_${randomUUID()}`;
        const event = {
          type: "email.complained",
          created_at: new Date().toISOString(),
          data: { email_id: providerId },
        };
        await assert.rejects(recordResendDeliveryEvent(id, event, db));
        assert.equal(
          (
            await db
              .select()
              .from(emailDeliveryEvents)
              .where(eq(emailDeliveryEvents.providerEventId, id))
          ).length,
          0,
        );
        await db.execute(
          sql`alter table email_suppressions drop constraint qa_fail_complaint`,
        );
        await recordResendDeliveryEvent(id, event, db);
        assert.equal((await read(first.id)).lastErrorCode, "email.complained");
      },
    );

    await t.test(
      "suppression blocks provider calls, while a new logical verified-address communication can send",
      async () => {
        const blocked = await queue();
        const before = providerCalls;
        await runEmailBatch(worker, 1);
        assert.equal(
          (await read(blocked.id)).lastErrorCode,
          "RECIPIENT_SUPPRESSED",
        );
        assert.equal(providerCalls, before);
        const changed = await queue(true);
        await runEmailBatch(worker, 1);
        assert.equal(
          (await read(changed.id)).recipientEmail,
          "new@example.invalid",
        );
        assert.equal((await read(changed.id)).status, "SENT");
        assert.equal(resolutions, 1);
        assert.equal(
          (await read(first.id)).recipientEmail,
          "developer@example.invalid",
        );
      },
    );
    await t.test(
      "delivered survives older and later failure events; failure then delivery clears stale error",
      async () => {
        const row = await queue(true);
        await db
          .update(emailOutbox)
          .set({
            status: "SENT",
            providerMessageId: randomUUID(),
            sentAt: new Date(),
          })
          .where(eq(emailOutbox.id, row.id));
        const id = (await read(row.id)).providerMessageId!;
        const emit = (type: string, date: Date) =>
          recordResendDeliveryEvent(
            `msg_${randomUUID()}`,
            { type, created_at: date.toISOString(), data: { email_id: id } },
            db,
          );
        await emit("email.failed", new Date());
        assert.equal((await read(row.id)).status, "FAILED");
        await emit("email.delivered", new Date());
        await emit("email.failed", new Date(Date.now() - 10000));
        await emit("email.failed", new Date(Date.now() + 10000));
        assert.equal((await read(row.id)).status, "SENT");
        assert.equal((await read(row.id)).lastErrorCode, null);
      },
    );
    const [admin] = await db
      .insert(schema.staffUsers)
      .values({
        staffReference: "CB-STF-ABCD1234",
        clerkUserId: "fabricated_admin",
        role: "ADMIN",
      })
      .returning();
    await db
      .insert(schema.staffUsers)
      .values({
        staffReference: "CB-STF-ABCD1235",
        clerkUserId: "fabricated_readonly",
        role: "READ_ONLY",
      });
    const [client] = await db
      .insert(schema.clientProfiles)
      .values({
        clientReference: "CB-CLT-ABCD1234",
        clerkUserId: "fabricated_client",
        firstName: "Fake",
        lastName: "Client",
      })
      .returning();
    const [other] = await db
      .insert(schema.clientProfiles)
      .values({
        clientReference: "CB-CLT-ABCD1235",
        clerkUserId: "fabricated_other",
        firstName: "Fake",
        lastName: "Other",
      })
      .returning();
    const [assessment] = await db
      .insert(schema.eligibilityAssessments)
      .values({
        clientProfileId: client.id,
        assessmentReference: "CB-ASM-ABCD1234",
        assessmentVersion: "1",
        status: "COMPLETE",
        currentSection: "review",
        answers: {
          jurisdiction: "england",
          deposit_paid: "yes",
          protected_told: "no",
        },
        preliminaryOutcome: "REVIEW_RECOMMENDED",
        startedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();
    const [claim] = await db
      .insert(schema.claims)
      .values({
        clientProfileId: client.id,
        eligibilityAssessmentId: assessment.id,
        claimReference: "CB-CLM-2026-ABCD1234",
        status: "INITIAL_REVIEW",
      })
      .returning();
    const send = (input: unknown, actor = admin.clerkUserId) =>
      db.transaction((tx) =>
        triggerCommunicationInTransaction(tx, actor, input),
      );
    const service = {
      preset: "GENERAL_SERVICE_UPDATE",
      clientReference: client.clientReference,
      title: "Service notice",
      body: "Our service desk hours have changed.",
      nextStep: "Review your account when convenient.",
      requestId: randomUUID(),
    };
    await t.test(
      "manual send denies clients, readonly and suspended administrators without mutations",
      async () => {
        for (const actor of [
          "fabricated_client",
          "fabricated_readonly",
          "missing_actor",
        ])
          await assert.rejects(send(service, actor), /permission/);
        await db
          .update(schema.staffUsers)
          .set({ status: "SUSPENDED" })
          .where(eq(schema.staffUsers.id, admin.id));
        await assert.rejects(send(service), /permission/);
        await db
          .update(schema.staffUsers)
          .set({ status: "ACTIVE" })
          .where(eq(schema.staffUsers.id, admin.id));
        assert.equal(
          (await db.select().from(schema.staffAuditEvents)).length,
          0,
        );
      },
    );
    await t.test(
      "manual send rejects arbitrary recipients and cross-client claim or assessment context",
      async () => {
        await assert.rejects(
          send({ ...service, recipientEmail: "victim@example.invalid" }),
        );
        await assert.rejects(
          send({
            ...service,
            clientReference: other.clientReference,
            claimReference: claim.claimReference,
          }),
        );
        await assert.rejects(
          send({
            ...service,
            clientReference: other.clientReference,
            assessmentReference: assessment.assessmentReference,
          }),
        );
        assert.equal(
          (await db.select().from(schema.staffAuditEvents)).length,
          0,
        );
      },
    );
    await t.test(
      "concurrent manual send dedupes outbox and safe audit in one transaction",
      async () => {
        const [a, b] = await Promise.all([send(service), send(service)]);
        assert.equal(a.emailReference, b.emailReference);
        const audits = await db.select().from(schema.staffAuditEvents);
        assert.equal(audits.length, 1);
        assert.doesNotMatch(
          JSON.stringify(audits[0].metadata),
          /fabricated_|@|service desk|clerk|clientProfileId/i,
        );
        const row = (
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.emailReference, a.emailReference))
        )[0];
        assert.equal(row.recipientType, "CLIENT");
        assert.equal(row.recipientEmail, null);
        assert.equal(row.recipientReference, client.clientReference);
      },
    );
    await t.test(
      "REQUEST_DOCUMENTS creates one canonical requirement, notification, real due date and email",
      async () => {
        const input = {
          preset: "REQUEST_DOCUMENTS",
          requestId: randomUUID(),
          clientReference: client.clientReference,
          claimReference: claim.claimReference,
          evidenceType: "TENANCY_AGREEMENT",
          dueDate: "2026-10-15",
        };
        const [a, b] = await Promise.all([send(input), send(input)]);
        assert.equal(a.emailReference, b.emailReference);
        const requirements = await db
          .select()
          .from(schema.claimEvidenceRequirements);
        assert.equal(requirements.length, 1);
        assert.equal(
          requirements[0].dueAt?.toISOString().slice(0, 10),
          "2026-10-15",
        );
        const notifications = await db
          .select()
          .from(schema.clientNotifications);
        assert.equal(
          notifications.filter((n) => n.type === "EVIDENCE_REQUESTED").length,
          1,
        );
        assert.equal(
          (
            await db
              .select()
              .from(emailOutbox)
              .where(eq(emailOutbox.emailReference, a.emailReference))
          )[0].eventKey,
          "EVIDENCE_REQUESTED",
        );
        assert.equal(
          (await send({ ...input, requestId: randomUUID() })).emailReference,
          a.emailReference,
        );
      },
    );
    await t.test(
      "NEXT_STEPS creates a real client task with one notification and email containing real stage",
      async () => {
        const input = {
          preset: "NEXT_STEPS",
          requestId: randomUUID(),
          clientReference: client.clientReference,
          claimReference: claim.claimReference,
          title: "Review your tenancy dates",
          body: "Confirm that your tenancy dates are correct in your claim.",
          actionType: "CONFIRM_INFORMATION",
          dueDate: "2026-10-15",
        };
        const [a, b] = await Promise.all([send(input), send(input)]);
        assert.equal(a.emailReference, b.emailReference);
        const actions = await db.select().from(schema.claimActionRequirements);
        assert.equal(actions.length, 1);
        assert.equal(actions[0].status, "OPEN");
        assert.equal(
          actions[0].dueAt?.toISOString().slice(0, 10),
          input.dueDate,
        );
        const row = (
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.emailReference, a.emailReference))
        )[0];
        assert.equal(row.eventKey, "CLIENT_ACTION_REQUIRED");
        assert.match(JSON.stringify(row.payload), /Initial review/);
        assert.equal(
          (await db.select().from(schema.clientNotifications)).filter(
            (n) => n.type === "CLIENT_ACTION_REQUIRED",
          ).length,
          1,
        );
      },
    );
    await t.test(
      "manual audit failure rolls back canonical task, notification and outbox",
      async () => {
        const before = (await db.select().from(emailOutbox)).length;
        await db.execute(
          sql`alter table staff_audit_events add constraint qa_manual_audit_failure check (action <> 'COMMUNICATION_TRIGGERED') not valid`,
        );
        await assert.rejects(
          send({
            preset: "ACTION_REQUIRED",
            clientReference: client.clientReference,
            claimReference: claim.claimReference,
            requestId: randomUUID(),
            title: "Review information",
            body: "Review your claim dates.",
            actionType: "REVIEW_INFORMATION",
          }),
        );
        assert.equal((await db.select().from(emailOutbox)).length, before);
        assert.equal(
          (await db.select().from(schema.claimActionRequirements)).length,
          1,
        );
        await db.execute(
          sql`alter table staff_audit_events drop constraint qa_manual_audit_failure`,
        );
      },
    );
    await t.test(
      "CLAIM_UPDATE uses the real recorded stage and adds portal history without changing status",
      async () => {
        const result = await send({
          preset: "CLAIM_UPDATE",
          clientReference: client.clientReference,
          claimReference: claim.claimReference,
          requestId: randomUUID(),
        });
        const row = (
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.emailReference, result.emailReference))
        )[0];
        assert.match(JSON.stringify(row.payload), /Initial review/);
        assert.equal(
          (
            await db
              .select()
              .from(schema.claims)
              .where(eq(schema.claims.id, claim.id))
          )[0].status,
          "INITIAL_REVIEW",
        );
        assert.equal(
          (await db.select().from(schema.clientNotifications)).filter(
            (n) => n.type === "CLAIM_PROGRESS_UPDATE",
          ).length,
          1,
        );
      },
    );
    await t.test(
      "START_CLAIM_REMINDER rejects existing claims and permits eligible saved assessment without creating a claim",
      async () => {
        const input = {
          preset: "START_CLAIM_REMINDER",
          clientReference: client.clientReference,
          assessmentReference: assessment.assessmentReference,
          requestId: randomUUID(),
        };
        await assert.rejects(send(input));
        const [saved] = await db
          .insert(schema.eligibilityAssessments)
          .values({
            ...assessment,
            id: randomUUID(),
            assessmentReference: "CB-ASM-ABCD1236",
          })
          .returning();
        const result = await send({
          ...input,
          assessmentReference: saved.assessmentReference,
        });
        assert.equal((await db.select().from(schema.claims)).length, 1);
        const row = (
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.emailReference, result.emailReference))
        )[0];
        assert.match(JSON.stringify(row.payload), /START MY CLAIM/);
        assert.match(
          JSON.stringify(row.payload),
          /account\/assessments\/CB-ASM-ABCD1236/,
        );
      },
    );
    await t.test(
      "pre-account follow-up uses only the saved snapshot and issues a bounded secure continuation",
      async () => {
        const [lead] = await db
          .insert(leadSchema.eligibilityLeads)
          .values({
            leadReference: "CB-LEAD-ABCD1234",
            handoffAssociationHash: "fake_hash",
            handoffTokenHash: "fake_token_hash",
            firstName: "Fake",
            email: "Developer@Example.Invalid",
            normalizedEmail: "developer@example.invalid",
            outcomeType: "REVIEW_RECOMMENDED",
            serviceContactConsentAt: new Date(),
            serviceContactConsentVersion: "test",
          })
          .returning();
        const [pre] = await db
          .insert(leadSchema.preAccountEligibilityAssessments)
          .values({
            assessmentReference: "CB-ASM-ABCD1237",
            leadId: lead.id,
            assessmentVersion: "1",
            answers: assessment.answers,
            preliminaryOutcome: "REVIEW_RECOMMENDED",
            startedAt: new Date(),
          })
          .returning();
        const input = {
          preset: "ASSESSMENT_FOLLOW_UP",
          assessmentReference: pre.assessmentReference,
          requestId: randomUUID(),
        };
        const result = await send(input);
        const row = (
          await db
            .select()
            .from(emailOutbox)
            .where(eq(emailOutbox.emailReference, result.emailReference))
        )[0];
        assert.equal(row.recipientType, "PRE_ACCOUNT");
        assert.equal(row.recipientEmail, "developer@example.invalid");
        assert.match(JSON.stringify(row.payload), /sign-up\?redirect_url=/);
        const tokens = await db
          .select()
          .from(leadSchema.eligibilityLeadConversionTokens);
        assert.equal(tokens.length, 1);
        assert.ok(tokens[0].expiresAt.getTime() > Date.now() + 6 * 86400000);
        await db
          .update(leadSchema.eligibilityLeads)
          .set({ convertedClientProfileId: client.id })
          .where(eq(leadSchema.eligibilityLeads.id, lead.id));
        await assert.rejects(send({ ...input, requestId: randomUUID() }));
      },
    );
    await t.test(
      "NEW_CLIENT emits exactly once across concurrent setup and respects active staff and channel preferences",
      async () => {
        await db
          .insert(schema.staffUsers)
          .values({
            staffReference: "CB-STF-ABCD1236",
            clerkUserId: "fabricated_suspended",
            role: "ADMIN",
            status: "SUSPENDED",
          });
        await db
          .insert(schema.staffNotificationPreferences)
          .values({
            staffUserId: admin.id,
            category: "CLIENTS",
            emailEnabled: false,
            inAppEnabled: true,
          });
        const input = profileSchema.parse({
          firstName: "Fake",
          lastName: "New client",
          country: "United Kingdom",
          preferredContactMethod: "email",
          preferredContactTime: "anytime",
        });
        const [a, b] = await Promise.all([
          upsertClientProfile("fabricated_new", input, db),
          upsertClientProfile("fabricated_new", input, db),
        ]);
        assert.equal(a.id, b.id);
        await upsertClientProfile(
          "fabricated_new",
          { ...input, firstName: "Updated" },
          db,
        );
        const notices = await db
          .select()
          .from(schema.staffNotifications)
          .where(eq(schema.staffNotifications.eventKey, "NEW_CLIENT"));
        assert.equal(notices.length, 1);
        assert.equal(notices[0].staffUserId, admin.id);
        assert.equal(
          (
            await db
              .select()
              .from(emailOutbox)
              .where(eq(emailOutbox.eventKey, "NEW_CLIENT"))
          ).length,
          0,
        );
        await db
          .update(schema.staffNotificationPreferences)
          .set({ emailEnabled: true, inAppEnabled: false });
        await upsertClientProfile("fabricated_new2", input, db);
        assert.equal(
          (
            await db
              .select()
              .from(schema.staffNotifications)
              .where(eq(schema.staffNotifications.eventKey, "NEW_CLIENT"))
          ).length,
          1,
        );
        const emails = await db
          .select()
          .from(emailOutbox)
          .where(eq(emailOutbox.eventKey, "NEW_CLIENT"));
        assert.equal(emails.length, 1);
        assert.equal(emails[0].recipientType, "STAFF");
        assert.equal(emails[0].recipientEmail, null);
      },
    );
  } finally {
    await pool?.end();
    // Only the exact schema created by this test is removed; public/user records are untouched.
    if (created && /^qa_communications_[a-f0-9]{16}$/.test(namespace))
      await source.query(`DROP SCHEMA "${namespace}" CASCADE`);
    await source.end();
  }
});
