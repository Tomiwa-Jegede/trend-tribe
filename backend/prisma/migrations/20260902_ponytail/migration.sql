-- ponytail: drop isFreeSlot (derived), store tokens directly (was quarter-units)
ALTER TABLE "listings" DROP COLUMN IF EXISTS "isFreeSlot";
ALTER TABLE "users" ALTER COLUMN "tokenBalance" SET DEFAULT 5;
UPDATE "users" SET "tokenBalance" = CEIL("tokenBalance"::float / 4) WHERE "tokenBalance" >= 4;
-- fix any 0-3 that would become 0
UPDATE "users" SET "tokenBalance" = 5 WHERE "tokenBalance" = 0;
