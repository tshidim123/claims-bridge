import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const emailOutbox = pgTable("email_outbox", {
  id: uuid("id").defaultRandom().primaryKey(), emailReference: text("email_reference").notNull().unique(), eventKey: text("event_key").notNull(), dedupeKey: text("dedupe_key").notNull(), recipientType: text("recipient_type").notNull(), recipientReference: text("recipient_reference"), recipientEmail: text("recipient_email").notNull(), templateKey: text("template_key").notNull(), templateVersion: text("template_version").notNull(), payload: jsonb("payload").notNull(), status: text("status").notNull().default("PENDING"), attemptCount: text("attempt_count").notNull().default("0"), availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(), processingStartedAt: timestamp("processing_started_at", { withTimezone: true }), sentAt: timestamp("sent_at", { withTimezone: true }), failedAt: timestamp("failed_at", { withTimezone: true }), providerMessageId: text("provider_message_id"), lastErrorCode: text("last_error_code"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("email_outbox_dedupe_key_unique").on(table.dedupeKey), index("email_outbox_delivery_idx").on(table.status, table.availableAt)]);

export const emailDeliveryEvents = pgTable("email_delivery_events", {
  id: uuid("id").defaultRandom().primaryKey(), emailOutboxId: uuid("email_outbox_id").notNull().references(() => emailOutbox.id, { onDelete: "cascade" }), providerEventId: text("provider_event_id").notNull().unique(), eventType: text("event_type").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("email_delivery_events_outbox_idx").on(table.emailOutboxId)]);

export const emailSuppressions = pgTable("email_suppressions", {
  id: uuid("id").defaultRandom().primaryKey(), normalizedEmail: text("normalized_email").notNull().unique(), reason: text("reason").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), clearedAt: timestamp("cleared_at", { withTimezone: true }),
});
