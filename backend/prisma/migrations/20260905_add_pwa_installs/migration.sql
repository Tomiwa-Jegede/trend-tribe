-- CreateTable
CREATE TABLE "pwa_installs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "platform" TEXT,
    "displayMode" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pwa_installs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pwa_installs_createdAt_idx" ON "pwa_installs"("createdAt");
CREATE INDEX "pwa_installs_platform_idx" ON "pwa_installs"("platform");
ALTER TABLE "pwa_installs" ADD CONSTRAINT "pwa_installs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
