import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { clientProfiles } from "./client-profiles";
import { eligibilityAssessments } from "./eligibility";
import { staffUsers } from "./staff";

export const eligibilityLeadStatuses = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"] as const;
export const eligibilityLeadStatus = pgEnum("eligibility_lead_status", eligibilityLeadStatuses);

export const eligibilityLeads = pgTable("eligibility_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadReference: text("lead_reference").notNull().unique(),
  handoffAssociationHash: text("handoff_association_hash").notNull().unique(),
  handoffTokenHash: text("handoff_token_hash").notNull().unique(),
  firstName: text("first_name").notNull(),
  email: text("email").notNull(),
  normalizedEmail: text("normalized_email").notNull(),
  phone: text("phone"),
  preferredContactMethod: text("preferred_contact_method").notNull().default("email"),
  outcomeType: text("outcome_type").notNull(),
  issueTags: jsonb("issue_tags").$type<string[]>().notNull().default([]),
  landingPath: text("landing_path"),
  status: eligibilityLeadStatus("status").notNull().default("NEW"),
  serviceContactConsentAt: timestamp("service_contact_consent_at", { withTimezone: true }).notNull(),
  serviceContactConsentVersion: text("service_contact_consent_version").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  marketingConsentVersion: text("marketing_consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  retentionReviewAt: timestamp("retention_review_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  convertedClientProfileId: uuid("converted_client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  convertedAssessmentId: uuid("converted_assessment_id").references(() => eligibilityAssessments.id, { onDelete: "set null" }),
}, (table) => [index("eligibility_leads_created_idx").on(table.createdAt), index("eligibility_leads_status_created_idx").on(table.status, table.createdAt), index("eligibility_leads_normalized_email_idx").on(table.normalizedEmail), index("eligibility_leads_converted_client_idx").on(table.convertedClientProfileId)]);

export const eligibilityLeadConversionTokens = pgTable("eligibility_lead_conversion_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => eligibilityLeads.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("eligibility_lead_tokens_lead_idx").on(table.leadId), index("eligibility_lead_tokens_expiry_idx").on(table.expiresAt)]);

export const preAccountEligibilityAssessments = pgTable("pre_account_eligibility_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessmentReference: text("assessment_reference").notNull().unique(),
  leadId: uuid("lead_id").notNull().unique().references(() => eligibilityLeads.id, { onDelete: "cascade" }),
  assessmentVersion: text("assessment_version").notNull(),
  status: text("status").notNull().default("COMPLETE"),
  answers: jsonb("answers").notNull(),
  preliminaryOutcome: text("preliminary_outcome").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  convertedClientProfileId: uuid("converted_client_profile_id").references(() => clientProfiles.id, { onDelete: "set null" }),
  convertedAssessmentId: uuid("converted_assessment_id").references(() => eligibilityAssessments.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("pre_account_assessments_created_idx").on(table.createdAt), index("pre_account_assessments_conversion_idx").on(table.convertedClientProfileId)]);

export const eligibilityLeadNotes = pgTable("eligibility_lead_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => eligibilityLeads.id, { onDelete: "cascade" }),
  authorStaffUserId: uuid("author_staff_user_id").notNull().references(() => staffUsers.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("eligibility_lead_notes_lead_created_idx").on(table.leadId, table.createdAt)]);

export type EligibilityLead = typeof eligibilityLeads.$inferSelect;
