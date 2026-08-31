import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { claimStatuses } from "@/config/claim-statuses";
import { clientProfiles } from "./client-profiles";
import { eligibilityAssessments } from "./eligibility";
import { staffUsers } from "./staff";

export const claimStatus = pgEnum("claim_status", claimStatuses);
export const claimOperationalPriority = pgEnum("claim_operational_priority", ["NORMAL", "ELEVATED", "HIGH"]);
export const claimHistoryEventType = pgEnum("claim_history_event_type", ["CLAIM_CREATED", "STATUS_CHANGED"]);
export const claimTimelineEventType = pgEnum("claim_timeline_event_type", [
  "CLAIM_SUBMITTED",
  "REVIEW_STARTED",
  "EVIDENCE_REQUESTED",
  "EVIDENCE_RECEIVED",
  "STATUS_UPDATED",
  "CLIENT_ACTION_REQUIRED",
  "CORRESPONDENCE_SENT",
  "RESOLUTION_UPDATE",
  "DOCUMENT_RECEIVED",
  "DOCUMENT_REVIEW_STARTED",
  "DOCUMENT_ACCEPTED",
  "MORE_EVIDENCE_REQUIRED",
]);
export const claimTimelineVisibility = pgEnum("claim_timeline_visibility", ["CLIENT", "INTERNAL"]);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientProfileId: uuid("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
    eligibilityAssessmentId: uuid("eligibility_assessment_id").notNull().unique().references(() => eligibilityAssessments.id, { onDelete: "restrict" }),
    claimReference: text("claim_reference").notNull().unique(),
    status: claimStatus("status").notNull().default("SUBMITTED"),
    operationalPriority: claimOperationalPriority("operational_priority").notNull().default("NORMAL"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByStaffId: uuid("archived_by_staff_id").references(() => staffUsers.id, { onDelete: "restrict" }),
    archiveReason: text("archive_reason"),
  },
  (table) => [
    index("claims_client_profile_created_idx").on(table.clientProfileId, table.createdAt),
    index("claims_client_profile_status_idx").on(table.clientProfileId, table.status),
    index("claims_eligibility_assessment_idx").on(table.eligibilityAssessmentId),
    index("claims_archived_at_idx").on(table.archivedAt),
  ],
);

export const claimStatusHistory = pgTable(
  "claim_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    fromStatus: claimStatus("from_status"),
    toStatus: claimStatus("to_status").notNull(),
    eventType: claimHistoryEventType("event_type").notNull(),
    actorType: text("actor_type").notNull().default("CLIENT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("claim_status_history_claim_created_idx").on(table.claimId, table.createdAt)],
);

export const claimTimelineEvents = pgTable(
  "claim_timeline_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    eventType: claimTimelineEventType("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    visibility: claimTimelineVisibility("visibility").notNull().default("CLIENT"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("claim_timeline_events_claim_occurred_idx").on(table.claimId, table.occurredAt)],
);

export type Claim = typeof claims.$inferSelect;
export type ClaimStatusHistory = typeof claimStatusHistory.$inferSelect;
export type ClaimTimelineEvent = typeof claimTimelineEvents.$inferSelect;
