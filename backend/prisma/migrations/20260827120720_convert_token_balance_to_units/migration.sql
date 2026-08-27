-- Convert existing balances from whole tokens to quarter-token units
-- (1 whole token = 4 units), so no user's real balance value changes.
UPDATE "users" SET "tokenBalance" = "tokenBalance" * 4;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tokenBalance" SET DEFAULT 20;
