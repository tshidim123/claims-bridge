CREATE TYPE "public"."claim_operational_priority" AS ENUM('NORMAL', 'ELEVATED', 'HIGH');--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_PRIORITY_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_ASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_REASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_UNASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."staff_audit_action" ADD VALUE 'CLAIM_INTERNAL_NOTE_ADDED';--> statement-breakpoint
CREATE TABLE "claim_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by_staff_user_id" uuid NOT NULL,
	"unassigned_at" timestamp with time zone,
	"unassigned_by_staff_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "claim_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_reference" text NOT NULL,
	"claim_id" uuid NOT NULL,
	"author_staff_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "claim_internal_notes_note_reference_unique" UNIQUE("note_reference")
);
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "operational_priority" "claim_operational_priority" DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_assignments" ADD CONSTRAINT "claim_assignments_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_assignments" ADD CONSTRAINT "claim_assignments_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_assignments" ADD CONSTRAINT "claim_assignments_assigned_by_staff_user_id_staff_users_id_fk" FOREIGN KEY ("assigned_by_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_assignments" ADD CONSTRAINT "claim_assignments_unassigned_by_staff_user_id_staff_users_id_fk" FOREIGN KEY ("unassigned_by_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_internal_notes" ADD CONSTRAINT "claim_internal_notes_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_internal_notes" ADD CONSTRAINT "claim_internal_notes_author_staff_user_id_staff_users_id_fk" FOREIGN KEY ("author_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "claim_assignments_current_claim_unique" ON "claim_assignments" USING btree ("claim_id") WHERE unassigned_at is null;--> statement-breakpoint
CREATE INDEX "claim_assignments_staff_current_idx" ON "claim_assignments" USING btree ("staff_user_id","unassigned_at","assigned_at");--> statement-breakpoint
CREATE INDEX "claim_assignments_claim_history_idx" ON "claim_assignments" USING btree ("claim_id","assigned_at");--> statement-breakpoint
CREATE INDEX "claim_internal_notes_claim_created_idx" ON "claim_internal_notes" USING btree ("claim_id","created_at");