/*
  Warnings:

  - Changed the type of `userId` on the `FrederickSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "FrederickSession" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FrederickSession_userId_sessionId_key" ON "FrederickSession"("userId", "sessionId");
