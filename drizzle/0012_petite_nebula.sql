CREATE TYPE "public"."claim_action_priority" AS ENUM('NORMAL', 'IMPORTANT');--> statement-breakpoint
CREATE TYPE "public"."claim_action_status" AS ENUM('OPEN', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."claim_action_type" AS ENUM('CONFIRM_INFORMATION', 'REVIEW_INFORMATION', 'CONTACT_CLAIMS_BRIDGE', 'COMPLETE_ACCOUNT_INFORMATION', 'GENERAL_ACTION');--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_MESSAGE_SENT';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_CONVERSATION_CLOSED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_CONVERSATION_REOPENED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLIENT_ACTION_CREATED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLIENT_ACTION_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLIENT_ACTION_CANCELLED';--> statement-breakpoint
CREATE TABLE "claim_action_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_reference" text NOT NULL,
	"claim_id" uuid NOT NULL,
	"type" "claim_action_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "claim_action_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "claim_action_priority" DEFAULT 'NORMAL' NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by_staff_user_id" uuid NOT NULL,
	CONSTRAINT "claim_action_requirements_action_reference_unique" UNIQUE("action_reference")
);
--> statement-breakpoint
ALTER TABLE "claim_action_requirements" ADD CONSTRAINT "claim_action_requirements_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_action_requirements" ADD CONSTRAINT "claim_action_requirements_created_by_staff_user_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_action_requirements_claim_status_idx" ON "claim_action_requirements" USING btree ("claim_id","status");--> statement-breakpoint
CREATE INDEX "claim_action_requirements_claim_created_idx" ON "claim_action_requirements" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE INDEX "claim_action_requirements_open_due_idx" ON "claim_action_requirements" USING btree ("status","due_at");