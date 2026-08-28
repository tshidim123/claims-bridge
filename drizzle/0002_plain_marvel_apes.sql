CREATE TYPE "public"."claim_history_event_type" AS ENUM('CLAIM_CREATED', 'STATUS_CHANGED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('SUBMITTED', 'INITIAL_REVIEW', 'INFORMATION_REQUIRED', 'EVIDENCE_COLLECTION', 'EVIDENCE_REVIEW', 'CLAIM_ASSESSMENT', 'CLAIM_PREPARATION', 'AWAITING_CLIENT', 'AWAITING_THIRD_PARTY', 'IN_PROGRESS', 'NEGOTIATION_OR_RESOLUTION', 'COMPLETED', 'CLOSED', 'NOT_ELIGIBLE');--> statement-breakpoint
CREATE TYPE "public"."claim_timeline_event_type" AS ENUM('CLAIM_SUBMITTED', 'REVIEW_STARTED', 'EVIDENCE_REQUESTED', 'EVIDENCE_RECEIVED', 'STATUS_UPDATED', 'CLIENT_ACTION_REQUIRED', 'CORRESPONDENCE_SENT', 'RESOLUTION_UPDATE');--> statement-breakpoint
CREATE TYPE "public"."claim_timeline_visibility" AS ENUM('CLIENT', 'INTERNAL');--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_profile_id" uuid NOT NULL,
	"eligibility_assessment_id" uuid NOT NULL,
	"claim_reference" text NOT NULL,
	"status" "claim_status" DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "claims_claim_reference_unique" UNIQUE("claim_reference")
);
--> statement-breakpoint
CREATE TABLE "claim_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"from_status" "claim_status",
	"to_status" "claim_status" NOT NULL,
	"event_type" "claim_history_event_type" NOT NULL,
	"actor_type" text DEFAULT 'CLIENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"event_type" "claim_timeline_event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"visibility" "claim_timeline_visibility" DEFAULT 'CLIENT' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_eligibility_assessment_id_eligibility_assessments_id_fk" FOREIGN KEY ("eligibility_assessment_id") REFERENCES "public"."eligibility_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_status_history" ADD CONSTRAINT "claim_status_history_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_timeline_events" ADD CONSTRAINT "claim_timeline_events_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_client_profile_created_idx" ON "claims" USING btree ("client_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "claims_client_profile_status_idx" ON "claims" USING btree ("client_profile_id","status");--> statement-breakpoint
CREATE INDEX "claims_eligibility_assessment_idx" ON "claims" USING btree ("eligibility_assessment_id");--> statement-breakpoint
CREATE INDEX "claim_status_history_claim_created_idx" ON "claim_status_history" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE INDEX "claim_timeline_events_claim_occurred_idx" ON "claim_timeline_events" USING btree ("claim_id","occurred_at");
