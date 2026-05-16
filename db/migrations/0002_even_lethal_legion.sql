CREATE TABLE "unmatched_inbound" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postmark_message_id" text NOT NULL,
	"from_address" text NOT NULL,
	"to_addresses" text[] NOT NULL,
	"subject" text,
	"body_excerpt" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unmatched_inbound_postmark_message_id_unique" ON "unmatched_inbound" USING btree ("postmark_message_id");--> statement-breakpoint
CREATE INDEX "unmatched_inbound_created_at_idx" ON "unmatched_inbound" USING btree ("created_at" DESC NULLS LAST);