import "server-only";
import { and, eq } from "drizzle-orm";
import { normalizeMailbox } from "./config";
import { getDb } from "@/lib/db";
import {
  emailDeliveryEvents,
  emailOutbox,
  emailSuppressions,
} from "@/lib/db/schema/communications";

import type { ResendEvent } from "./webhook-handler";

// Resend's documented lifecycle events; opens/clicks and other events are not retained.
const supportedEvents = new Set([
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
]);
const suppressionEvents = new Set([
  "email.bounced",
  "email.complained",
  "email.suppressed",
]);

export async function recordResendDeliveryEvent(
  providerEventId: string,
  event: ResendEvent,
  db = getDb(),
) {
  if (!supportedEvents.has(event.type)) return;
  await db.transaction(async (tx) => {
    const outbox = (
      await tx
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.providerMessageId, event.data.email_id))
        .limit(1)
        .for("update")
    )[0];
    if (!outbox) throw new Error("Communication not yet available.");
    const stored = await tx
      .insert(emailDeliveryEvents)
      .values({
        emailOutboxId: outbox.id,
        providerEventId,
        eventType: event.type,
        occurredAt: new Date(event.created_at),
      })
      .onConflictDoNothing({ target: emailDeliveryEvents.providerEventId })
      .returning({ id: emailDeliveryEvents.id });
    if (!stored.length) return;
    const now = new Date();
    if (suppressionEvents.has(event.type)) {
      if (outbox.recipientEmail)
        await tx
          .insert(emailSuppressions)
          .values({
            normalizedEmail: normalizeMailbox(outbox.recipientEmail)!,
            reason: event.type,
          })
          .onConflictDoUpdate({
            target: emailSuppressions.normalizedEmail,
            set: { reason: event.type, clearedAt: null },
          });
      await tx
        .update(emailOutbox)
        .set({
          status: "FAILED",
          failedAt: now,
          lastErrorCode: event.type,
          updatedAt: now,
        })
        .where(eq(emailOutbox.id, outbox.id));
    } else if (!suppressionEvents.has(outbox.lastErrorCode ?? "")) {
      if (event.type === "email.delivered")
        await tx
          .update(emailOutbox)
          .set({ status: "SENT", failedAt: null, lastErrorCode: null, updatedAt: now })
          .where(eq(emailOutbox.id, outbox.id));
      // Delivery is stronger evidence than a failure event, regardless of arrival order.
      const delivered = await tx.select({ id: emailDeliveryEvents.id }).from(emailDeliveryEvents)
        .where(and(eq(emailDeliveryEvents.emailOutboxId, outbox.id), eq(emailDeliveryEvents.eventType, "email.delivered"))).limit(1);
      if (event.type === "email.failed" && !delivered.length)
        await tx
          .update(emailOutbox)
          .set({
            status: "FAILED",
            failedAt: now,
            lastErrorCode: "PROVIDER_FAILED",
            updatedAt: now,
          })
          .where(eq(emailOutbox.id, outbox.id));
    }
  });
}
