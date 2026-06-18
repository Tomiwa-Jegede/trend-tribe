-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "imagePublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
