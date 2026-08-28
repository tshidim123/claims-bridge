import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { claims } from "./claims";
import { staffUsers } from "./staff";

export const claimAssignments = pgTable(
  "claim_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "restrict" }),
    staffUserId: uuid("staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedByStaffUserId: uuid("assigned_by_staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "restrict" }),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
    unassignedByStaffUserId: uuid("unassigned_by_staff_user_id").references(() => staffUsers.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("claim_assignments_current_claim_unique").on(table.claimId).where(sql`unassigned_at is null`),
    index("claim_assignments_staff_current_idx").on(table.staffUserId, table.unassignedAt, table.assignedAt),
    index("claim_assignments_claim_history_idx").on(table.claimId, table.assignedAt),
  ],
);

export const claimInternalNotes = pgTable(
  "claim_internal_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    noteReference: text("note_reference").notNull().unique(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "restrict" }),
    authorStaffUserId: uuid("author_staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("claim_internal_notes_claim_created_idx").on(table.claimId, table.createdAt)],
);

export type ClaimAssignment = typeof claimAssignments.$inferSelect;
export type ClaimInternalNote = typeof claimInternalNotes.$inferSelect;
