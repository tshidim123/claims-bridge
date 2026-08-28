CREATE TYPE "public"."claim_document_security_status" AS ENUM('PENDING_VALIDATION', 'VALIDATED', 'SECURITY_REVIEW_REQUIRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."claim_document_storage_provider" AS ENUM('R2');--> statement-breakpoint
CREATE TYPE "public"."claim_document_upload_status" AS ENUM('AUTHORIZED', 'FINALIZING', 'FINALIZED', 'EXPIRED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "claim_document_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"evidence_requirement_id" uuid,
	"document_id" uuid,
	"object_key" text NOT NULL,
	"category" "claim_document_category" NOT NULL,
	"display_name" text NOT NULL,
	"original_filename" text NOT NULL,
	"declared_mime_type" text NOT NULL,
	"declared_size_bytes" bigint NOT NULL,
	"status" "claim_document_upload_status" DEFAULT 'AUTHORIZED' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "claim_document_uploads_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "claim_documents" ADD COLUMN "document_reference" text;--> statement-breakpoint
ALTER TABLE "claim_documents" ADD COLUMN "checksum" text;--> statement-breakpoint
ALTER TABLE "claim_documents" ADD COLUMN "storage_provider" "claim_document_storage_provider" DEFAULT 'R2' NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_documents" ADD COLUMN "security_status" "claim_document_security_status" DEFAULT 'PENDING_VALIDATION' NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_documents" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claim_document_uploads" ADD CONSTRAINT "claim_document_uploads_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_document_uploads" ADD CONSTRAINT "claim_document_uploads_evidence_requirement_id_claim_evidence_requirements_id_fk" FOREIGN KEY ("evidence_requirement_id") REFERENCES "public"."claim_evidence_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_document_uploads" ADD CONSTRAINT "claim_document_uploads_document_id_claim_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."claim_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_document_uploads_claim_status_idx" ON "claim_document_uploads" USING btree ("claim_id","status");--> statement-breakpoint
CREATE INDEX "claim_document_uploads_expires_idx" ON "claim_document_uploads" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_document_reference_unique" UNIQUE("document_reference");