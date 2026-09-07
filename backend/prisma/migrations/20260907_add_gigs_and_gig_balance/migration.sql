-- Add gigBalance to users, Gigs escrow, GigTokenPurchase, GigWithdrawal
ALTER TABLE "users" ADD COLUMN "gigBalance" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "gigs" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "escrowAmount" INTEGER NOT NULL,
    "timerHours" INTEGER NOT NULL DEFAULT 24,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "posterId" INTEGER NOT NULL,
    "claimerId" INTEGER,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "gig_token_purchases" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "flutterwaveTransactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gig_token_purchases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "gig_withdrawals" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gig_withdrawals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gig_token_purchases_reference_key" ON "gig_token_purchases"("reference");
CREATE UNIQUE INDEX "gig_token_purchases_flutterwaveTransactionId_key" ON "gig_token_purchases"("flutterwaveTransactionId");
CREATE INDEX "gigs_status_expiresAt_idx" ON "gigs"("status", "expiresAt");
CREATE INDEX "gigs_posterId_idx" ON "gigs"("posterId");
CREATE INDEX "gigs_claimerId_idx" ON "gigs"("claimerId");
CREATE INDEX "gig_withdrawals_userId_status_idx" ON "gig_withdrawals"("userId", "status");
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_claimerId_fkey" FOREIGN KEY ("claimerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gig_token_purchases" ADD CONSTRAINT "gig_token_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gig_withdrawals" ADD CONSTRAINT "gig_withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
