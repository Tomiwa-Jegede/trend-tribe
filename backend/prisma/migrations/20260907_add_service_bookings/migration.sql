-- Add ServiceBooking for SERVICES category (1h, 20% provider fee, escrow)
CREATE TABLE "service_bookings" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "bookerId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_bookings_listingId_status_idx" ON "service_bookings"("listingId", "status");
CREATE INDEX "service_bookings_bookerId_idx" ON "service_bookings"("bookerId");
CREATE INDEX "service_bookings_providerId_status_idx" ON "service_bookings"("providerId", "status");
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_bookerId_fkey" FOREIGN KEY ("bookerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
