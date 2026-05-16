ALTER TABLE "executives" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "executives_tags_gin_idx" ON "executives" USING gin ("tags");