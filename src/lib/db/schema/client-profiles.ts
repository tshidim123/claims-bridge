import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const onboardingStatus = pgEnum("onboarding_status", ["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]);
export const preferredContactMethod = pgEnum("preferred_contact_method", ["email", "phone"]);
export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientReference: text("client_reference").notNull().unique(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  preferredContactMethod: preferredContactMethod("preferred_contact_method").notNull().default("email"),
  onboardingStatus: onboardingStatus("onboarding_status").notNull().default("IN_PROGRESS"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type ClientProfile = typeof clientProfiles.$inferSelect;
