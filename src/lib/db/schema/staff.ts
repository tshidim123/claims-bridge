import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { staffAuditActions, staffAuditActorTypes, staffRoles, staffStatuses } from "@/config/staff";

export const staffRole = pgEnum("staff_role", staffRoles);
export const staffStatus = pgEnum("staff_status", staffStatuses);
export const staffAuditActorType = pgEnum("staff_audit_actor_type", staffAuditActorTypes);
export const staffAuditAction = pgEnum("staff_audit_action", staffAuditActions);

export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffReference: text("staff_reference").notNull().unique(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    displayName: text("display_name"),
    role: staffRole("role").notNull(),
    status: staffStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdByStaffId: uuid("created_by_staff_id"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedByStaffId: uuid("suspended_by_staff_id"),
  },
  (table) => [index("staff_users_status_role_idx").on(table.status, table.role)],
);

export const staffAuditEvents = pgTable(
  "staff_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorStaffUserId: uuid("actor_staff_user_id").references(() => staffUsers.id, { onDelete: "set null" }),
    actorType: staffAuditActorType("actor_type").notNull(),
    action: staffAuditAction("action").notNull(),
    targetType: text("target_type"),
    targetReference: text("target_reference"),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | string[]>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staff_audit_events_created_idx").on(table.createdAt),
    index("staff_audit_events_actor_created_idx").on(table.actorStaffUserId, table.createdAt),
  ],
);

export type StaffUser = typeof staffUsers.$inferSelect;
export type StaffAuditEvent = typeof staffAuditEvents.$inferSelect;
