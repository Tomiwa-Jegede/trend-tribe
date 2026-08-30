/*
  Warnings:

  - The values [BOOKS,ELECTRONICS,CLOTHING,FURNITURE,STATIONERY,SPORTS,FOOD,SERVICES,OTHER] on the enum `Category` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Subcategory" AS ENUM ('MENS_FASHION', 'FEMALE_FASHION', 'SKIN_CARE', 'FRAGRANCE');

-- AlterEnum
BEGIN;
CREATE TYPE "Category_new" AS ENUM ('ACCESSORIES', 'FASHION', 'BEAUTY_AND_PERSONAL_CARE', 'OTHERS');
ALTER TABLE "listings" ALTER COLUMN "category" TYPE "Category_new" USING (
  CASE "category"::text
    WHEN 'CLOTHING' THEN 'FASHION'
    ELSE 'OTHERS'
  END
)::"Category_new";
ALTER TYPE "Category" RENAME TO "Category_old";
ALTER TYPE "Category_new" RENAME TO "Category";
DROP TYPE "Category_old";
COMMIT;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "subcategory" "Subcategory";
