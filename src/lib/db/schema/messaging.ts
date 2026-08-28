import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { claims } from "./claims";

export const claimConversationStatus = pgEnum("claim_conversation_status", ["OPEN", "CLOSED"]);
export const claimMessageSenderType = pgEnum("claim_message_sender_type", ["CLIENT", "CLAIMS_BRIDGE", "SYSTEM"]);
export const claimMessageType = pgEnum("claim_message_type", ["MESSAGE", "SYSTEM_UPDATE"]);
export const claimMessageReadViewerType = pgEnum("claim_message_read_viewer_type", ["CLIENT", "CLAIMS_BRIDGE"]);

export const claimConversations = pgTable(
  "claim_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().unique().references(() => claims.id, { onDelete: "cascade" }),
    status: claimConversationStatus("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (table) => [index("claim_conversations_status_last_message_idx").on(table.status, table.lastMessageAt)],
);

export const claimMessages = pgTable(
  "claim_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => claimConversations.id, { onDelete: "cascade" }),
    senderType: claimMessageSenderType("sender_type").notNull(),
    messageType: claimMessageType("message_type").notNull().default("MESSAGE"),
    body: text("body").notNull(),
    clientVisible: boolean("client_visible").notNull().default(true),
    clientRequestId: text("client_request_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [index("claim_messages_conversation_created_idx").on(table.conversationId, table.createdAt, table.id)],
);

export const claimMessageReads = pgTable(
  "claim_message_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => claimConversations.id, { onDelete: "cascade" }),
    viewerType: claimMessageReadViewerType("viewer_type").notNull(),
    viewerId: text("viewer_id").notNull(),
    lastReadMessageId: uuid("last_read_message_id").references(() => claimMessages.id, { onDelete: "set null" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("claim_message_reads_conversation_viewer_idx").on(table.conversationId, table.viewerType, table.viewerId),
    index("claim_message_reads_viewer_idx").on(table.viewerType, table.viewerId),
    uniqueIndex("claim_message_reads_conversation_viewer_unique").on(table.conversationId, table.viewerType, table.viewerId),
  ],
);

export type ClaimConversation = typeof claimConversations.$inferSelect;
export type ClaimMessage = typeof claimMessages.$inferSelect;
export type ClaimMessageRead = typeof claimMessageReads.$inferSelect;
