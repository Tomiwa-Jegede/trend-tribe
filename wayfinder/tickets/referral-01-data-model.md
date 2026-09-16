# Referral Data Model — Minimal Schema Delta

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: — (frontier)
Blocks: `Referral Signup Capture Flow`, `Commission Engine & Wallet Credit`, `Idempotency & Duplicate Protection`, `Refund Reversal & Expiry`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
What is the minimum Prisma schema change that satisfies the referral data requirements without duplicating existing architecture?

Decide:

- Where `referralCode` lives (`User.referralCode` unique vs separate table) and generation constraints (index, case-insensitivity, cuid vs 6-char).
- Shape of `Referral` (referrerId, referredId, referralCode used, signup date, commission window start/end, status ACTIVE/EXPIRED) — unique constraints (one referred user → one referrer, immutable).
- Shape of `ReferralCommission` (referralId, transaction discriminator + transactionId, referrerId, referredId, amount, rate, commission amount, status PENDING/CREDITED/REVERSED, timestamps) and its unique guard against duplicate commission per transaction.
- Whether to extend `PendingRegistration` to carry `referralCode` through OTP window.
- Indexes needed for "active referrals for user" and "commission history" queries.
- Migration ordering (`referralCode` backfill for existing users).

Context: existing models are `User`, `PendingRegistration`, `TokenPurchase`, `GigTokenPurchase`, `Gig`, `ServiceBooking`, `GigWalletTransaction`, `PlatformProfit` — see `backend/prisma/schema.prisma:11`.

Grilling + domain-modeling: weigh single `User.referralCode` + two new tables vs embedding commission directly in `GigWalletTransaction.meta`.

---

## Resolution — CLOSED 2026-09-16

**Decision:** Add 1 field to `User`, 1 field to `PendingRegistration`, and 2 new models (`Referral`, `ReferralCommission`). No separate wallet, no changes to `GigWalletTransaction` shape — commissions credit existing `User.gigBalance` via `recordWalletMovement` with `type: "REFERRAL_CREDIT"`. Every commission traceable Referrer → Referred → Transaction → Commission → Ledger.

### Chosen Prisma delta (apply to `backend/prisma/schema.prisma:11` / `72`)

```prisma
model User {
  // ...existing 70 lines...
  referralCode            String?              @unique // 6-8 char, upper alphanumeric, see ticket 02
  referralsMade           Referral[]           @relation("Referrer")
  referralReceived        Referral?            @relation("Referred") // one referrer per user, enforced by Referral.referredId @unique
  commissionsEarned       ReferralCommission[] @relation("CommissionReferrer")
  commissionsGenerated    ReferralCommission[] @relation("CommissionReferred")
}

model PendingRegistration {
  // ...existing...
  referralCode String? // raw code carried through OTP window, nullable
}

model Referral {
  id                Int      @id @default(autoincrement())
  referrerId        Int
  referredId        Int      @unique // immutability: one row per referred user, never changes
  referralCode      String   // denormalized code used at signup for audit
  commissionStartAt DateTime @default(now())
  commissionEndAt   DateTime // start + REFERRAL_DURATION_MONTHS (env) computed at creation
  status            String   @default("ACTIVE") // ACTIVE | EXPIRED (query-time + optional cron)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  referrer    User                 @relation("Referrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referred    User                 @relation("Referred", fields: [referredId], references: [id], onDelete: Cascade)
  commissions ReferralCommission[]

  @@index([referrerId, status])
  @@index([commissionEndAt])
  @@index([createdAt])
  @@map("referrals")
}

model ReferralCommission {
  id               Int       @id @default(autoincrement())
  referralId       Int
  referrerId       Int
  referredId       Int
  transactionType  String    // GIG_TOPUP | GIG | SERVICE (discriminator, see ticket 03)
  transactionId    String    // GigTokenPurchase.reference | Gig.id | ServiceBooking.id as string
  amountKobo       Int       // eligible transaction principal (kobo)
  rate             Float     // snapshot of REFERRAL_COMMISSION_RATE at creation (e.g. 0.05)
  commissionAmount Int       // floor(amountKobo * rate)
  status           String    @default("CREDITED") // CREDITED | REVERSED
  createdAt        DateTime  @default(now())
  reversedAt       DateTime?

  referral Referral @relation(fields: [referralId], references: [id], onDelete: Cascade)
  referrer User     @relation("CommissionReferrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referred User     @relation("CommissionReferred", fields: [referredId], references: [id], onDelete: Cascade)

  @@unique([transactionType, transactionId]) // duplicate protection — webhook retry safe
  @@index([referrerId, createdAt]) // earnings history
  @@index([referralId])
  @@index([referredId])
  @@map("referral_commissions")
}
```

### Why this shape

- **Ponytail / minimal delta:** Reuses `gigBalance` (`User.gigBalance Int` kobo, already withdrawn via `gig.controller.js:withdrawGig` with `GigWithdrawal`). No new balance column, no new wallet table — violates spec's "DO NOT create a separate wallet unless architecture genuinely requires it". `GigWalletTransaction` already audits all movements via `recordWalletMovement` with `tx` param; referral just adds two `type` values (`REFERRAL_CREDIT` / `REFERRAL_REVERSAL`).
- **ReferralCode on User, not separate table:** Lookup is `findUnique where referralCode`, O(1) unique index; avoids join. Upper-alphanumeric keeps URLs safe (`/signup?ref=ABC123`). `String? @unique` allows null for existing users until backfill/lazy mint.
- **PendingRegistration.referralCode:** OTP flow deletes `PendingRegistration` on expiry and recreates on resend — code must survive `resendRegistrationOtp`. Storing raw code (not FK) avoids FK to not-yet-created User.
- **Referral.referredId @unique:** Enforces "one referrer permanently, never changeable" at DB level, not just app check. Immutability is not a controller `if` — it's a constraint.
- **Commission window stored, not computed:** `commissionEndAt` denormalized at creation avoids recomputing `start + 6 months` on every eligible transaction check and lets dashboard show countdown without math drift. `status` is query-derived (`commissionEndAt > now() ? ACTIVE : EXPIRED`) but kept for index/cron convenience.
- **ReferralCommission per transaction, not per referral period:** Supports "10 referrals → 10 independent 6-month windows" — each commission joins to one `Referral` row, so referrer dashboard can group by `referralId`.
- **@@unique([transactionType, transactionId]):** Single guard covering all eligible transaction kinds; alternative `@@unique([referralId, transactionId])` would allow same Flutterwave `gt_` reference to credit two different referrers if code bug — discriminator+id is stronger and makes audit "Why ₦X? → transactionType+id → amount" unambiguous. Rate snapshot enables "5% changed to 7% later but history stays 5%".
- **Indexes:** `referrals [referrerId,status]` for "active referrals" count; `[commissionEndAt]` for expiry cron; `referral_commissions [referrerId,createdAt]` for paginated earnings history (`GET /api/referrals/commissions?referrerId`).

### Alternatives rejected

- Embedding commission only in `GigWalletTransaction.meta`: loses queryability (`SUM commissionAmount per referral`), loses unique duplicate guard, breaks admin trace ("show commissions for gig #123").
- Separate `ReferralWallet` or `referralBalance` on User: requires duplicating withdrawal logic already battle-tested in `gig.controller.js:withdrawGig` (PIN, 1% fee, `GigWithdrawal` table).
- `Referral.status` enum table or `expiresAt` nullable: string with two values keeps migration small; Prisma enum adds migration complexity for negligible benefit.

### Migration & backfill order

1. `npx prisma migrate dev --name add_referral` — adds nullable `referralCode` + 2 tables (no data loss, no backfill required to migrate).
2. Backfill existing users: one-off script `backend/src/scripts/backfillReferralCodes.js` — `findMany where referralCode is null`, call `generateReferralCode()` (ticket 02) with retry on `P2002`, `updateMany`. Lazy mint fallback: `getMe`/`dashboard` endpoint mints on first read if still null (idempotent `updateMany where referralCode is null`).
3. `prisma generate` → controller updates.

### Verification

- `npx prisma validate && npx prisma format` passes.
- `SELECT * FROM referrals WHERE referredId = ?` returns 0 or 1.
- `INSERT INTO referral_commissions (transactionType, transactionId) VALUES ('GIG', '123'), ('GIG','123')` → second fails `P2002` on unique.
- Wallet trace: `ReferralCommission.referralId → Referral.referredId → Gig.id → GigWalletTransaction where type=REFERRAL_CREDIT and meta.referralCommissionId = commission.id` — single join path.

Closes ticket. Unblocks `Referral Code Generation Strategy`, `Referral Signup Capture Flow`, `Commission Engine & Wallet Credit`, `Idempotency & Duplicate Protection`, `Refund Reversal & Expiry`.

Assets: none (decision only; schema snippet above is spec, not applied — apply in build).

