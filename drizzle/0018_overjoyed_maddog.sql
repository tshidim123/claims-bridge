CREATE TYPE "public"."preferred_contact_time" AS ENUM('morning', 'afternoon', 'evening', 'anytime', 'custom');--> statement-breakpoint
ALTER TYPE "public"."preferred_contact_method" ADD VALUE 'whatsapp';--> statement-breakpoint
ALTER TYPE "public"."preferred_contact_method" ADD VALUE 'no_preference';--> statement-breakpoint
CREATE TABLE "client_profile_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_reference" text NOT NULL,
	"client_profile_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"selected_fields" text[] NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_profile_shares_share_reference_unique" UNIQUE("share_reference"),
	CONSTRAINT "client_profile_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "preferred_contact_time" "preferred_contact_time" DEFAULT 'anytime' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "preferred_contact_time_note" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "address_line_1" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "address_line_2" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "postcode" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "country" text DEFAULT 'United Kingdom' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profile_shares" ADD CONSTRAINT "client_profile_shares_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_profile_shares_client_expiry_idx" ON "client_profile_shares" USING btree ("client_profile_id","expires_at");