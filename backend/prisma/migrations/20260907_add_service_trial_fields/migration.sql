-- Add service trial fields for SERVICES category
ALTER TABLE "users" ADD COLUMN "firstServiceAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "serviceTrialEndsAt" TIMESTAMP(3);
