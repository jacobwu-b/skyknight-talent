DROP TABLE IF EXISTS "interactions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "pipeline_entries" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "searches" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "executives" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "users" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."interaction_direction";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."pipeline_stage";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."search_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_role";--> statement-breakpoint
-- pg_trgm intentionally not dropped; other tenants may rely on it.
