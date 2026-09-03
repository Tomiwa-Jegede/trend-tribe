-- Allow 0.5 token charges for extra image space
ALTER TABLE "users" ALTER COLUMN "tokenBalance" TYPE DOUBLE PRECISION USING "tokenBalance"::double precision;
ALTER TABLE "users" ALTER COLUMN "tokenBalance" SET DEFAULT 5;
