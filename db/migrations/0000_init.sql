CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."interaction_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('identified', 'contacted', 'screening', 'partner_interview', 'client_interview', 'offer', 'placed', 'passed');--> statement-breakpoint
CREATE TYPE "public"."search_status" AS ENUM('open', 'paused', 'filled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('partner', 'associate');--> statement-breakpoint
CREATE TABLE "executives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"linkedin_url" text,
	"current_role" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executive_id" uuid NOT NULL,
	"pipeline_entry_id" uuid,
	"sender_id" uuid,
	"sender_role" "user_role" NOT NULL,
	"direction" "interaction_direction" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"subject" text,
	"body_excerpt" text,
	"postmark_message_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executive_id" uuid NOT NULL,
	"search_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"stage" "pipeline_stage" DEFAULT 'identified' NOT NULL,
	"base_salary_cents" integer,
	"target_bonus_cents" integer,
	"equity_bps" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_company" text NOT NULL,
	"role_title" text NOT NULL,
	"hiring_manager" text NOT NULL,
	"status" "search_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_executive_id_executives_id_fk" FOREIGN KEY ("executive_id") REFERENCES "public"."executives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_pipeline_entry_id_pipeline_entries_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_executive_id_executives_id_fk" FOREIGN KEY ("executive_id") REFERENCES "public"."executives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "executives_email_unique" ON "executives" USING btree ("email");--> statement-breakpoint
CREATE INDEX "executives_updated_at_idx" ON "executives" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "executives_name_trgm_idx" ON "executives" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "executives_current_role_trgm_idx" ON "executives" USING gin ("current_role" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "interactions_postmark_message_id_unique" ON "interactions" USING btree ("postmark_message_id");--> statement-breakpoint
CREATE INDEX "interactions_executive_occurred_at_idx" ON "interactions" USING btree ("executive_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_pipeline_entry_occurred_at_idx" ON "interactions" USING btree ("pipeline_entry_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_duplicate_window_idx" ON "interactions" USING btree ("executive_id","sender_role","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_entries_open_unique" ON "pipeline_entries" USING btree ("executive_id","search_id") WHERE stage NOT IN ('placed', 'passed');--> statement-breakpoint
CREATE INDEX "pipeline_entries_search_stage_idx" ON "pipeline_entries" USING btree ("search_id","stage");--> statement-breakpoint
CREATE INDEX "pipeline_entries_executive_idx" ON "pipeline_entries" USING btree ("executive_id");--> statement-breakpoint
CREATE INDEX "pipeline_entries_owner_idx" ON "pipeline_entries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "pipeline_entries_updated_at_idx" ON "pipeline_entries" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "searches_company_status_idx" ON "searches" USING btree ("portfolio_company","status");--> statement-breakpoint
CREATE INDEX "searches_created_at_idx" ON "searches" USING btree ("created_at" DESC NULLS LAST);