CREATE TABLE "email_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_reference" text NOT NULL UNIQUE,
  "event_key" text NOT NULL,
  "dedupe_key" text NOT NULL UNIQUE,
  "recipient_type" text NOT NULL,
  "recipient_reference" text,
  "recipient_email" text NOT NULL,
  "template_key" text NOT NULL,
  "template_version" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "attempt_count" text DEFAULT '0' NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processing_started_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "provider_message_id" text,
  "last_error_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "email_outbox_delivery_idx" ON "email_outbox" ("status", "available_at");
CREATE TABLE "email_delivery_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_outbox_id" uuid NOT NULL REFERENCES "email_outbox"("id") ON DELETE cascade,
  "provider_event_id" text NOT NULL UNIQUE,
  "event_type" text NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "email_delivery_events_outbox_idx" ON "email_delivery_events" ("email_outbox_id");
CREATE TABLE "email_suppressions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "normalized_email" text NOT NULL UNIQUE,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cleared_at" timestamp with time zone
);
