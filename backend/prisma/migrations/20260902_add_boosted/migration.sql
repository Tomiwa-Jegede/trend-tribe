-- Add boostedAt/boostedUntil for featured product cards (Marketplace top only)
ALTER TABLE "listings" ADD COLUMN "boostedAt" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "boostedUntil" TIMESTAMP(3);
CREATE INDEX "listings_boostedUntil_idx" ON "listings"("boostedUntil");
