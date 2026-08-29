/*
  Warnings:

  - A unique constraint covering the columns `[flutterwaveTransactionId]` on the table `TokenPurchase` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TokenPurchase" ADD COLUMN     "flutterwaveTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TokenPurchase_flutterwaveTransactionId_key" ON "TokenPurchase"("flutterwaveTransactionId");
