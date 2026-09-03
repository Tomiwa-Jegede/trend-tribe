-- CreateTable messages for inbox
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "listingId" INTEGER,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_recipientId_read_idx" ON "messages"("recipientId", "read");
CREATE INDEX "messages_recipientId_createdAt_idx" ON "messages"("recipientId", "createdAt");
CREATE INDEX "messages_listingId_idx" ON "messages"("listingId");
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
