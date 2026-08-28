CREATE TYPE "public"."claim_document_category" AS ENUM('TENANCY_AGREEMENT', 'DEPOSIT_PAYMENT', 'DEPOSIT_PROTECTION', 'PRESCRIBED_INFORMATION', 'SCHEME_CORRESPONDENCE', 'LANDLORD_CORRESPONDENCE', 'LETTING_AGENT_CORRESPONDENCE', 'FINANCIAL_RECORD', 'IDENTITY', 'OTHER_SUPPORTING_EVIDENCE');--> statement-breakpoint
CREATE TYPE "public"."claim_document_status" AS ENUM('PENDING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REPLACEMENT_REQUESTED');--> statement-breakpoint
CREATE TYPE "public"."claim_evidence_requirement_priority" AS ENUM('LOW', 'NORMAL', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."claim_evidence_requirement_status" AS ENUM('REQUESTED', 'UPLOADED', 'UNDER_REVIEW', 'ACCEPTED', 'MORE_INFORMATION_REQUIRED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."claim_evidence_requirement_type" AS ENUM('TENANCY_AGREEMENT', 'DEPOSIT_PAYMENT_EVIDENCE', 'DEPOSIT_PROTECTION_CERTIFICATE', 'PRESCRIBED_INFORMATION', 'SCHEME_CORRESPONDENCE', 'LANDLORD_CORRESPONDENCE', 'LETTING_AGENT_CORRESPONDENCE', 'BANK_OR_PAYMENT_RECORD', 'IDENTITY_DOCUMENT', 'OTHER_SUPPORTING_EVIDENCE');--> statement-breakpoint
ALTER TYPE "public"."claim_timeline_event_type" ADD VALUE 'DOCUMENT_RECEIVED';--> statement-breakpoint
ALTER TYPE "public"."claim_timeline_event_type" ADD VALUE 'DOCUMENT_REVIEW_STARTED';--> statement-breakpoint
ALTER TYPE "public"."claim_timeline_event_type" ADD VALUE 'DOCUMENT_ACCEPTED';--> statement-breakpoint
ALTER TYPE "public"."claim_timeline_event_type" ADD VALUE 'MORE_EVIDENCE_REQUIRED';--> statement-breakpoint
CREATE TABLE "claim_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"evidence_requirement_id" uuid,
	"category" "claim_document_category" NOT NULL,
	"display_name" text NOT NULL,
	"original_filename" text,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" bigint,
	"status" "claim_document_status" DEFAULT 'PENDING_UPLOAD' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_evidence_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"type" "claim_evidence_requirement_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "claim_evidence_requirement_status" DEFAULT 'REQUESTED' NOT NULL,
	"priority" "claim_evidence_requirement_priority" DEFAULT 'NORMAL' NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_evidence_requirement_id_claim_evidence_requirements_id_fk" FOREIGN KEY ("evidence_requirement_id") REFERENCES "public"."claim_evidence_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence_requirements" ADD CONSTRAINT "claim_evidence_requirements_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_documents_claim_created_idx" ON "claim_documents" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE INDEX "claim_documents_claim_requirement_idx" ON "claim_documents" USING btree ("claim_id","evidence_requirement_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_requirements_claim_status_idx" ON "claim_evidence_requirements" USING btree ("claim_id","status");--> statement-breakpoint
CREATE INDEX "claim_evidence_requirements_claim_visible_idx" ON "claim_evidence_requirements" USING btree ("claim_id","client_visible");