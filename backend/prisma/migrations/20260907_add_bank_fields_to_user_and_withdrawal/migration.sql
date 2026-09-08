-- Add bank fields to users and gig withdrawals for bank-verified payout
ALTER TABLE "users" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "users" ADD COLUMN "bankCode" TEXT;
ALTER TABLE "users" ADD COLUMN "bankName" TEXT;
ALTER TABLE "gig_withdrawals" ADD COLUMN "bankCode" TEXT;
ALTER TABLE "gig_withdrawals" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "gig_withdrawals" ADD COLUMN "bankName" TEXT;
ALTER TABLE "gig_withdrawals" ADD COLUMN "accountName" TEXT;
ALTER TABLE "gig_withdrawals" ADD COLUMN "fee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "gig_withdrawals" ADD COLUMN "reference" TEXT;
ALTER TABLE "gig_withdrawals" ALTER COLUMN "whatsapp" DROP NOT NULL;
CREATE UNIQUE INDEX "gig_withdrawals_reference_key" ON "gig_withdrawals"("reference");
