-- Add OTP fields for PIN update verification
ALTER TABLE "users" ADD COLUMN "gigPinOtpCode" TEXT;
ALTER TABLE "users" ADD COLUMN "gigPinOtpExpiresAt" TIMESTAMP(3);
