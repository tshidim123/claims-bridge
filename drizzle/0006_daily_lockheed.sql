CREATE TYPE "public"."claim_conversation_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."claim_message_read_viewer_type" AS ENUM('CLIENT', 'CLAIMS_BRIDGE');--> statement-breakpoint
CREATE TYPE "public"."claim_message_sender_type" AS ENUM('CLIENT', 'CLAIMS_BRIDGE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."claim_message_type" AS ENUM('MESSAGE', 'SYSTEM_UPDATE');--> statement-breakpoint
CREATE TABLE "claim_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"status" "claim_conversation_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone,
	CONSTRAINT "claim_conversations_claim_id_unique" UNIQUE("claim_id")
);
--> statement-breakpoint
CREATE TABLE "claim_message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"viewer_type" "claim_message_read_viewer_type" NOT NULL,
	"viewer_id" text NOT NULL,
	"last_read_message_id" uuid,
	"last_read_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_type" "claim_message_sender_type" NOT NULL,
	"message_type" "claim_message_type" DEFAULT 'MESSAGE' NOT NULL,
	"body" text NOT NULL,
	"client_visible" boolean DEFAULT true NOT NULL,
	"client_request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "claim_messages_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
ALTER TABLE "claim_conversations" ADD CONSTRAINT "claim_conversations_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_message_reads" ADD CONSTRAINT "claim_message_reads_conversation_id_claim_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."claim_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_message_reads" ADD CONSTRAINT "claim_message_reads_last_read_message_id_claim_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."claim_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_messages" ADD CONSTRAINT "claim_messages_conversation_id_claim_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."claim_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claim_conversations_status_last_message_idx" ON "claim_conversations" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "claim_message_reads_conversation_viewer_idx" ON "claim_message_reads" USING btree ("conversation_id","viewer_type","viewer_id");--> statement-breakpoint
CREATE INDEX "claim_message_reads_viewer_idx" ON "claim_message_reads" USING btree ("viewer_type","viewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_message_reads_conversation_viewer_unique" ON "claim_message_reads" USING btree ("conversation_id","viewer_type","viewer_id");--> statement-breakpoint
CREATE INDEX "claim_messages_conversation_created_idx" ON "claim_messages" USING btree ("conversation_id","created_at","id");