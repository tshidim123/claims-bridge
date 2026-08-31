CREATE TYPE "public"."eligibility_lead_status" AS ENUM('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'CLOSED');--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'LEAD_STATUS_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'LEAD_NOTE_ADDED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'LEAD_CONVERTED';--> statement-breakpoint
CREATE TABLE "eligibility_lead_conversion_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eligibility_lead_conversion_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "eligibility_lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_staff_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eligibility_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_reference" text NOT NULL,
	"handoff_association_hash" text NOT NULL,
	"handoff_token_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"phone" text,
	"preferred_contact_method" text DEFAULT 'email' NOT NULL,
	"outcome_type" text NOT NULL,
	"issue_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"landing_path" text,
	"status" "eligibility_lead_status" DEFAULT 'NEW' NOT NULL,
	"service_contact_consent_at" timestamp with time zone NOT NULL,
	"service_contact_consent_version" text NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent_at" timestamp with time zone,
	"marketing_consent_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_review_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"converted_client_profile_id" uuid,
	"converted_assessment_id" uuid,
	CONSTRAINT "eligibility_leads_lead_reference_unique" UNIQUE("lead_reference"),
	CONSTRAINT "eligibility_leads_handoff_association_hash_unique" UNIQUE("handoff_association_hash"),
	CONSTRAINT "eligibility_leads_handoff_token_hash_unique" UNIQUE("handoff_token_hash")
);
--> statement-breakpoint
ALTER TABLE "eligibility_lead_conversion_tokens" ADD CONSTRAINT "eligibility_lead_conversion_tokens_lead_id_eligibility_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."eligibility_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_lead_notes" ADD CONSTRAINT "eligibility_lead_notes_lead_id_eligibility_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."eligibility_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_lead_notes" ADD CONSTRAINT "eligibility_lead_notes_author_staff_user_id_staff_users_id_fk" FOREIGN KEY ("author_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_leads" ADD CONSTRAINT "eligibility_leads_converted_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("converted_client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_leads" ADD CONSTRAINT "eligibility_leads_converted_assessment_id_eligibility_assessments_id_fk" FOREIGN KEY ("converted_assessment_id") REFERENCES "public"."eligibility_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eligibility_lead_tokens_lead_idx" ON "eligibility_lead_conversion_tokens" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "eligibility_lead_tokens_expiry_idx" ON "eligibility_lead_conversion_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "eligibility_lead_notes_lead_created_idx" ON "eligibility_lead_notes" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "eligibility_leads_created_idx" ON "eligibility_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "eligibility_leads_status_created_idx" ON "eligibility_leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "eligibility_leads_normalized_email_idx" ON "eligibility_leads" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "eligibility_leads_converted_client_idx" ON "eligibility_leads" USING btree ("converted_client_profile_id");