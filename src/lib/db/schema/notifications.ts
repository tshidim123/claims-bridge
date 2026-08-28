import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { notificationTypes, type NotificationCategory, type NotificationChannel, type NotificationPriority } from "@/config/notifications";
import { claims } from "./claims";
import { clientProfiles } from "./client-profiles";

export const clientNotificationType = pgEnum("client_notification_type", notificationTypes);
export const clientNotificationCategory = pgEnum("client_notification_category", ["CLAIM", "ACTION_REQUIRED", "EVIDENCE", "DOCUMENTS", "MESSAGES", "ACCOUNT"]);
export const clientNotificationPriority = pgEnum("client_notification_priority", ["INFORMATION", "IMPORTANT", "ACTION_REQUIRED"]);
export const clientNotificationActionType = pgEnum("client_notification_action_type", ["VIEW_CLAIM", "VIEW_TIMELINE", "VIEW_EVIDENCE", "VIEW_DOCUMENTS", "VIEW_MESSAGES", "VIEW_ASSESSMENT", "ACCOUNT"]);
export const clientNotificationChannel = pgEnum("client_notification_channel", ["IN_APP", "EMAIL", "SMS", "PUSH"]);

export const clientNotifications = pgTable(
  "client_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationReference: text("notification_reference").notNull().unique(),
    clientProfileId: uuid("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id").references(() => claims.id, { onDelete: "cascade" }),
    type: clientNotificationType("type").notNull(),
    category: clientNotificationCategory("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: clientNotificationPriority("priority").notNull(),
    actionType: clientNotificationActionType("action_type"),
    actionReference: text("action_reference"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    dedupeKey: text("dedupe_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("client_notifications_profile_created_idx").on(table.clientProfileId, table.createdAt),
    index("client_notifications_profile_read_created_idx").on(table.clientProfileId, table.readAt, table.createdAt),
    index("client_notifications_claim_idx").on(table.claimId),
    index("client_notifications_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export const clientNotificationPreferences = pgTable(
  "client_notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientProfileId: uuid("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
    category: clientNotificationCategory("category").notNull(),
    channel: clientNotificationChannel("channel").notNull().default("IN_APP"),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("client_notification_preferences_profile_category_channel_unique").on(table.clientProfileId, table.category, table.channel),
    index("client_notification_preferences_profile_idx").on(table.clientProfileId),
  ],
);

export type ClientNotification = typeof clientNotifications.$inferSelect;
export type ClientNotificationPreference = typeof clientNotificationPreferences.$inferSelect;
export type ClientNotificationCategory = NotificationCategory;
export type ClientNotificationPriority = NotificationPriority;
export type ClientNotificationChannel = NotificationChannel;
