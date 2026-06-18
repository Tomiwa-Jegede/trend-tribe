-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "coverPosition" JSONB DEFAULT '{"x": 50, "y": 50}';
