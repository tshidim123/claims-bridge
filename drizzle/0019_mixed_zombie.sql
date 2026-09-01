CREATE TABLE "pre_account_eligibility_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_reference" text NOT NULL,
	"lead_id" uuid NOT NULL,
	"assessment_version" text NOT NULL,
	"status" text DEFAULT 'COMPLETE' NOT NULL,
	"answers" jsonb NOT NULL,
	"preliminary_outcome" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"converted_at" timestamp with time zone,
	"converted_client_profile_id" uuid,
	"converted_assessment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_account_eligibility_assessments_assessment_reference_unique" UNIQUE("assessment_reference"),
	CONSTRAINT "pre_account_eligibility_assessments_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
ALTER TABLE "pre_account_eligibility_assessments" ADD CONSTRAINT "pre_account_eligibility_assessments_lead_id_eligibility_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."eligibility_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_account_eligibility_assessments" ADD CONSTRAINT "pre_account_eligibility_assessments_converted_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("converted_client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_account_eligibility_assessments" ADD CONSTRAINT "pre_account_eligibility_assessments_converted_assessment_id_eligibility_assessments_id_fk" FOREIGN KEY ("converted_assessment_id") REFERENCES "public"."eligibility_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pre_account_assessments_created_idx" ON "pre_account_eligibility_assessments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pre_account_assessments_conversion_idx" ON "pre_account_eligibility_assessments" USING btree ("converted_client_profile_id");