ALTER TABLE "email_outbox" ADD COLUMN "provider_request" jsonb;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "provider_first_attempt_at" timestamp with time zone;
--> statement-breakpoint
-- Pre-upgrade in-flight sends have no durable provider idempotency request.
-- Preserve their history and require reconciliation instead of risking a duplicate send.
-- Quiesce any old worker before applying this migration during a future rollout.
UPDATE "email_outbox"
SET "status" = 'FAILED', "last_error_code" = 'DELIVERY_UNCERTAIN',
    "failed_at" = COALESCE("failed_at", now()), "updated_at" = now()
WHERE "status" = 'PROCESSING';
