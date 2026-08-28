CREATE TYPE "public"."staff_audit_action" AS ENUM('STAFF_BOOTSTRAPPED', 'STAFF_CREATED', 'STAFF_ROLE_CHANGED', 'STAFF_SUSPENDED', 'STAFF_REACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."staff_audit_actor_type" AS ENUM('STAFF', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'CASE_MANAGER', 'EVIDENCE_REVIEWER', 'SUPPORT', 'READ_ONLY');--> statement-breakpoint
CREATE TYPE "public"."staff_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "staff_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_staff_user_id" uuid,
	"actor_type" "staff_audit_actor_type" NOT NULL,
	"action" "staff_audit_action" NOT NULL,
	"target_type" text,
	"target_reference" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_reference" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text,
	"role" "staff_role" NOT NULL,
	"status" "staff_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_staff_id" uuid,
	"suspended_at" timestamp with time zone,
	"suspended_by_staff_id" uuid,
	CONSTRAINT "staff_users_staff_reference_unique" UNIQUE("staff_reference"),
	CONSTRAINT "staff_users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "staff_audit_events" ADD CONSTRAINT "staff_audit_events_actor_staff_user_id_staff_users_id_fk" FOREIGN KEY ("actor_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_audit_events_created_idx" ON "staff_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "staff_audit_events_actor_created_idx" ON "staff_audit_events" USING btree ("actor_staff_user_id","created_at");--> statement-breakpoint
CREATE INDEX "staff_users_status_role_idx" ON "staff_users" USING btree ("status","role");