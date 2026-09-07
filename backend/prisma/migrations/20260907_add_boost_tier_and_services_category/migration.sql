-- Add boostTier for x1/x2 and SERVICES category
ALTER TYPE "Category" ADD VALUE 'SERVICES';
ALTER TABLE "listings" ADD COLUMN "boostTier" INTEGER DEFAULT 1;
CREATE INDEX "listings_boostTier_idx" ON "listings"("boostTier");
