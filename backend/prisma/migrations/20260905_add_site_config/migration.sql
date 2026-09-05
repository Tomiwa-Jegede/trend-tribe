-- CreateTable
CREATE TABLE "site_config" (
    "id" INTEGER NOT NULL,
    "whatsappMembers" INTEGER NOT NULL DEFAULT 63,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);
-- Create initial row
INSERT INTO "site_config" ("id", "whatsappMembers", "updatedAt") VALUES (1, 63, NOW()) ON CONFLICT ("id") DO NOTHING;
