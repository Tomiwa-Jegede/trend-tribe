-- Add soldAt and archivedAt to listings for Wayfinder buyer-trust ghost-prune slice (keep bool as filter)
ALTER TABLE "listings" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "archivedAt" TIMESTAMP(3);
