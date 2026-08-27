CREATE TYPE "public"."onboarding_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');
--> statement-breakpoint
CREATE TYPE "public"."preferred_contact_method" AS ENUM('email', 'phone');
--> statement-breakpoint
CREATE TABLE "client_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text NOT NULL UNIQUE,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" text,
  "preferred_contact_method" "preferred_contact_method" DEFAULT 'email' NOT NULL,
  "onboarding_status" "onboarding_status" DEFAULT 'IN_PROGRESS' NOT NULL,
  "onboarding_completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
