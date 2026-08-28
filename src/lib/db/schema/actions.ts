import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { clientActionPriorities, clientActionStatuses, clientActionTypes } from "@/config/client-actions";
import { claims } from "./claims";
import { staffUsers } from "./staff";

export const claimActionType = pgEnum("claim_action_type", clientActionTypes);
export const claimActionStatus = pgEnum("claim_action_status", clientActionStatuses);
export const claimActionPriority = pgEnum("claim_action_priority", clientActionPriorities);

export const claimActionRequirements = pgTable(
  "claim_action_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actionReference: text("action_reference").notNull().unique(),
    clientRequestId: text("client_request_id").unique(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    type: claimActionType("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: claimActionStatus("status").notNull().default("OPEN"),
    priority: claimActionPriority("priority").notNull().default("NORMAL"),
    clientVisible: boolean("client_visible").notNull().default(true),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdByStaffUserId: uuid("created_by_staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("claim_action_requirements_claim_status_idx").on(table.claimId, table.status),
    index("claim_action_requirements_claim_created_idx").on(table.claimId, table.createdAt),
    index("claim_action_requirements_open_due_idx").on(table.status, table.dueAt),
  ],
);

export type ClaimActionRequirement = typeof claimActionRequirements.$inferSelect;
