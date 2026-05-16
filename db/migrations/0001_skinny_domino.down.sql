DROP INDEX IF EXISTS "executives_tags_gin_idx";
ALTER TABLE "executives" DROP COLUMN IF EXISTS "tags";
