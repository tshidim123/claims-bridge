CREATE TABLE "eligibility_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_profile_id" uuid NOT NULL REFERENCES "client_profiles"("id") ON DELETE CASCADE,
  "assessment_version" text NOT NULL,
  "status" text NOT NULL,
  "current_section" text NOT NULL,
  "current_question_id" text,
  "answers" jsonb NOT NULL,
  "preliminary_outcome" text,
  "started_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "eligibility_assessments_client_profile_idx" ON "eligibility_assessments" USING btree ("client_profile_id");
--> statement-breakpoint
CREATE TABLE "eligibility_handoffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "assessment_version" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "redeemed_at" timestamp with time zone
);
