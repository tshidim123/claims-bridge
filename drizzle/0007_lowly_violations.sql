CREATE TYPE "public"."client_notification_action_type" AS ENUM('VIEW_CLAIM', 'VIEW_TIMELINE', 'VIEW_EVIDENCE', 'VIEW_DOCUMENTS', 'VIEW_MESSAGES', 'VIEW_ASSESSMENT', 'ACCOUNT');--> statement-breakpoint
CREATE TYPE "public"."client_notification_category" AS ENUM('CLAIM', 'ACTION_REQUIRED', 'EVIDENCE', 'DOCUMENTS', 'MESSAGES', 'ACCOUNT');--> statement-breakpoint
CREATE TYPE "public"."client_notification_channel" AS ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."client_notification_priority" AS ENUM('INFORMATION', 'IMPORTANT', 'ACTION_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."client_notification_type" AS ENUM('CLAIM_STATUS_UPDATED', 'CLIENT_ACTION_REQUIRED', 'EVIDENCE_REQUESTED', 'EVIDENCE_MORE_INFORMATION_REQUIRED', 'DOCUMENT_RECEIVED', 'DOCUMENT_REVIEW_UPDATE', 'NEW_MESSAGE', 'CLAIM_PROGRESS_UPDATE', 'CLAIM_COMPLETED', 'ACCOUNT_NOTICE');--> statement-breakpoint
CREATE TABLE "client_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_profile_id" uuid NOT NULL,
	"category" "client_notification_category" NOT NULL,
	"channel" "client_notification_channel" DEFAULT 'IN_APP' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_profile_id" uuid NOT NULL,
	"claim_id" uuid,
	"type" "client_notification_type" NOT NULL,
	"category" "client_notification_category" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "client_notification_priority" NOT NULL,
	"action_type" "client_notification_action_type",
	"action_reference" text,
	"source_type" text,
	"source_id" text,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "client_notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "client_notification_preferences" ADD CONSTRAINT "client_notification_preferences_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notifications" ADD CONSTRAINT "client_notifications_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notifications" ADD CONSTRAINT "client_notifications_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_notification_preferences_profile_category_channel_unique" ON "client_notification_preferences" USING btree ("client_profile_id","category","channel");--> statement-breakpoint
CREATE INDEX "client_notification_preferences_profile_idx" ON "client_notification_preferences" USING btree ("client_profile_id");--> statement-breakpoint
CREATE INDEX "client_notifications_profile_created_idx" ON "client_notifications" USING btree ("client_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "client_notifications_profile_read_created_idx" ON "client_notifications" USING btree ("client_profile_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "client_notifications_claim_idx" ON "client_notifications" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "client_notifications_source_idx" ON "client_notifications" USING btree ("source_type","source_id");