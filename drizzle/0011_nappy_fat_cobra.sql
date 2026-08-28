ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_STATUS_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'EVIDENCE_REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'EVIDENCE_STATUS_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'DOCUMENT_STATUS_CHANGED';--> statement-breakpoint
ALTER TABLE "claim_evidence_requirements" ADD COLUMN "requirement_reference" text;--> statement-breakpoint
UPDATE "claim_evidence_requirements" SET "requirement_reference" = 'CB-EVR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) WHERE "requirement_reference" IS NULL;--> statement-breakpoint
ALTER TABLE "claim_evidence_requirements" ALTER COLUMN "requirement_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_evidence_requirements" ADD CONSTRAINT "claim_evidence_requirements_requirement_reference_unique" UNIQUE("requirement_reference");
