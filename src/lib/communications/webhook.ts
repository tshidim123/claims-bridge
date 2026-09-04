import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailDeliveryEvents, emailOutbox, emailSuppressions } from "@/lib/db/schema/communications";

type ResendEvent = { type?: string; created_at?: string; data?: { email_id?: string; to?: string[] } };
export async function recordResendDeliveryEvent(providerEventId: string, event: ResendEvent) {
  const providerMessageId = event.data?.email_id; if (!providerMessageId || !event.type) return;
  const db = getDb(); const outbox = (await db.select().from(emailOutbox).where(eq(emailOutbox.providerMessageId, providerMessageId)).limit(1))[0]; if (!outbox) return;
  const occurredAt = event.created_at && !Number.isNaN(new Date(event.created_at).getTime()) ? new Date(event.created_at) : new Date();
  const stored = (await db.insert(emailDeliveryEvents).values({ emailOutboxId: outbox.id, providerEventId, eventType: event.type, occurredAt }).onConflictDoNothing({ target: emailDeliveryEvents.providerEventId }).returning())[0]; if (!stored) return;
  if (event.type === "email.delivered") await db.update(emailOutbox).set({ status: "SENT", updatedAt: new Date() }).where(eq(emailOutbox.id, outbox.id));
  if (event.type === "email.bounced" || event.type === "email.complained") { await db.insert(emailSuppressions).values({ normalizedEmail: outbox.recipientEmail, reason: event.type }).onConflictDoUpdate({ target: emailSuppressions.normalizedEmail, set: { reason: event.type, clearedAt: null } }); await db.update(emailOutbox).set({ status: "FAILED", failedAt: new Date(), lastErrorCode: event.type, updatedAt: new Date() }).where(eq(emailOutbox.id, outbox.id)); }
  if (event.type === "email.failed") await db.update(emailOutbox).set({ status: "FAILED", failedAt: new Date(), lastErrorCode: "PROVIDER_FAILED", updatedAt: new Date() }).where(eq(emailOutbox.id, outbox.id));
}
