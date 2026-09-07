-- Add gigAccountNumber to users (10 digits) + GigTransfer for wallet-to-wallet (fee 50/100)
ALTER TABLE "users" ADD COLUMN "gigAccountNumber" TEXT;
CREATE UNIQUE INDEX "users_gigAccountNumber_key" ON "users"("gigAccountNumber");
CREATE TABLE "gig_transfers" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gig_transfers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gig_transfers_reference_key" ON "gig_transfers"("reference");
CREATE INDEX "gig_transfers_fromUserId_createdAt_idx" ON "gig_transfers"("fromUserId", "createdAt");
CREATE INDEX "gig_transfers_toUserId_createdAt_idx" ON "gig_transfers"("toUserId", "createdAt");
ALTER TABLE "gig_transfers" ADD CONSTRAINT "gig_transfers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gig_transfers" ADD CONSTRAINT "gig_transfers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
