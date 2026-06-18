/*
  Warnings:

  - A unique constraint covering the columns `[matricNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `school` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "matricNumber" TEXT,
ALTER COLUMN "school" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_matricNumber_key" ON "users"("matricNumber");
