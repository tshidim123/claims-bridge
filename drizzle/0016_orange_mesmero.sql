ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_ARCHIVED' BEFORE 'EVIDENCE_REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_RESTORED' BEFORE 'EVIDENCE_REQUESTED';--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "archived_by_staff_id" uuid;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "eligibility_assessments" ADD COLUMN "assessment_reference" text;--> statement-breakpoint
UPDATE "eligibility_assessments" SET "assessment_reference" = 'CB-ASM-' || upper(substr(md5("id"::text), 1, 8)) WHERE "assessment_reference" IS NULL;--> statement-breakpoint
ALTER TABLE "eligibility_assessments" ALTER COLUMN "assessment_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_archived_by_staff_id_staff_users_id_fk" FOREIGN KEY ("archived_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_archived_at_idx" ON "claims" USING btree ("archived_at");--> statement-breakpoint
ALTER TABLE "eligibility_assessments" ADD CONSTRAINT "eligibility_assessments_assessment_reference_unique" UNIQUE("assessment_reference");
