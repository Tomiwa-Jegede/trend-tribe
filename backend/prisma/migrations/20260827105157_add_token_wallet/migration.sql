/*
  Warnings:

  - You are about to drop the column `extraListingSlots` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "editCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFreeSlot" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "extraListingSlots",
ADD COLUMN     "aiUsesRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberViewsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenBalance" INTEGER NOT NULL DEFAULT 5;
