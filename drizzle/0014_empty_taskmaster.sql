ALTER TABLE "client_profiles" ADD COLUMN "client_reference" text;--> statement-breakpoint
UPDATE "client_profiles" SET "client_reference" = 'CB-CLT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) WHERE "client_reference" IS NULL;--> statement-breakpoint
ALTER TABLE "client_profiles" ALTER COLUMN "client_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_client_reference_unique" UNIQUE("client_reference");
