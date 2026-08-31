-- AlterTable: add marketing fields
ALTER TABLE "users" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "unsubscribeToken" TEXT;

-- Backfill existing users with a unique token
UPDATE "users" SET "unsubscribeToken" = gen_random_uuid()::text WHERE "unsubscribeToken" IS NULL;

-- Enforce NOT NULL + UNIQUE once every row has a value
ALTER TABLE "users" ALTER COLUMN "unsubscribeToken" SET NOT NULL;
CREATE UNIQUE INDEX "users_unsubscribeToken_key" ON "users"("unsubscribeToken");

-- AlterEnum: add SNACKS to Category
ALTER TYPE "Category" ADD VALUE 'SNACKS';

-- AlterEnum: add TIES to Subcategory
ALTER TYPE "Subcategory" ADD VALUE 'TIES';
