-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "contactViews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "contact_views" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "viewerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_views_listingId_createdAt_idx" ON "contact_views"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_views_viewerId_idx" ON "contact_views"("viewerId");

-- AddForeignKey
ALTER TABLE "contact_views" ADD CONSTRAINT "contact_views_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_views" ADD CONSTRAINT "contact_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
