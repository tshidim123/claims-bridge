import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const onboardingStatus = pgEnum("onboarding_status", ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]);
export const preferredContactMethod = pgEnum("preferred_contact_method", ["email", "phone", "whatsapp", "no_preference"]);
export const preferredContactTime = pgEnum("preferred_contact_time", ["morning", "afternoon", "evening", "anytime", "custom"]);
export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientReference: text("client_reference").notNull().unique(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  preferredContactMethod: preferredContactMethod("preferred_contact_method").notNull().default("email"),
  preferredContactTime: preferredContactTime("preferred_contact_time").notNull().default("anytime"),
  preferredContactTimeNote: text("preferred_contact_time_note"),
  bio: text("bio"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  region: text("region"),
  postcode: text("postcode"),
  country: text("country").notNull().default("United Kingdom"),
  onboardingStatus: onboardingStatus("onboarding_status").notNull().default("IN_PROGRESS"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientProfileShares = pgTable("client_profile_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  shareReference: text("share_reference").notNull().unique(),
  clientProfileId: uuid("client_profile_id").notNull().references(() => clientProfiles.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  selectedFields: text("selected_fields").array().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("client_profile_shares_client_expiry_idx").on(table.clientProfileId, table.expiresAt)]);
export type ClientProfile = typeof clientProfiles.$inferSelect;
