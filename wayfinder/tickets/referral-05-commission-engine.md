# Commission Engine & Wallet Credit

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Transaction Eligibility`, `Referral Signup Capture Flow`, `Idempotency & Duplicate Protection`
Blocks: `Refund Reversal & Expiry`, `Admin & Notifications`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
How does a successful eligible transaction atomically create and credit a referral commission to the referrer's existing wallet, backend as source of truth, never frontend?

Decide:

- Engine location: `backend/src/utils/referral.js` helper `maybeCreditReferral({ referredUserId, transactionType, transactionId, amountKobo, tx })` called from each eligible commit point (e.g. inside `creditGigPurchase` transaction, `confirmGig`/`completeServiceBooking` transaction) — not from controllers' HTTP layer and not from `payment.controller.js:handleWebhook` outside the `$transaction`.
- Eligibility check order: lookup active `Referral` for `referredId`, verify `commissionEndAt > now()` and `status === ACTIVE`, compute `commissionAmount = floor(amountKobo * REFERRAL_RATE)` (integer kobo, no float).
- Ledger integration: credit `User.gigBalance` (existing wallet, not new wallet) increment + `GigWalletTransaction {type: "REFERRAL_CREDIT", direction: "CREDIT"}` via `recordWalletMovement` inside the same `prisma.$transaction`, plus `ReferralCommission` row in same tx — reuse `backend/src/utils/wallet.js:recordWalletMovement` transactional path (`tx` param).
- Config: `REFERRAL_COMMISSION_RATE` and `REFERRAL_DURATION_MONTHS` centralized in `backend/src/config/env.js` and read from `process.env` (see ticket 08), never scattered `0.05`.
- Why `gigBalance` is the existing wallet (already used for `gig.controller.js`, `serviceBooking`, withdrawals with `GigWithdrawal`) vs `tokenBalance`.

Grilling + domain-modeling: choose the minimal hook that keeps webhook idempotency (`updateMany where status=PENDING`) intact.

---

## Resolution — CLOSED 2026-09-16

**Decision:** Single helper `backend/src/utils/referral.js:maybeCreditReferral({referredId, transactionType, transactionId, amountKobo, tx})` called **inside** the existing `$transaction` that already moves the eligible transaction's money (never from controller HTTP layer, never from `handleWebhook` outside tx). Credits `gigBalance` (existing wallet) + `GigWalletTransaction REFERRAL_CREDIT` + `ReferralCommission` atomically; backend is source of truth, frontend never calculates.

### Helper location & signature (`backend/src/utils/referral.js`)

```js
const prisma = require('../db');
const config = require('../config/env'); // config.referral.rate/durationMonths from ticket 08

async function maybeCreditReferral({ referredId, transactionType, transactionId, amountKobo, tx }) {
  const db = tx || prisma;
  // 1) duplicate guard (ticket 06 — @@unique)
  const existing = await db.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
  if (existing) return existing;
  // 2) referral active check
  const referral = await db.referral.findUnique({ where: { referredId } });
  if (!referral) return null;
  if (referral.status === 'EXPIRED' || referral.commissionEndAt < new Date()) {
    // lazy expiry: flip status if past window (idempotent)
    if (referral.status !== 'EXPIRED') await db.referral.update({ where: { id: referral.id }, data: { status: 'EXPIRED' } }).catch(()=>{});
    return null;
  }
  // 3) compute integer kobo
  const rate = config.referral.rate; // 0.05
  const commissionAmount = Math.floor(amountKobo * rate);
  if (commissionAmount <= 0) return null;
  // 4) atomic create + credit + ledger (all on tx, so same commit)
  try {
    const commission = await db.referralCommission.create({
      data: { referralId: referral.id, referrerId: referral.referrerId, referredId, transactionType, transactionId: String(transactionId), amountKobo, rate, commissionAmount, status: 'CREDITED' }
    });
    await db.user.update({ where: { id: referral.referrerId }, data: { gigBalance: { increment: commissionAmount } } });
    // transactional ledger — uses tx path of recordWalletMovement internally or direct create for atomicity
    await db.gigWalletTransaction.create({
      data: { userId: referral.referrerId, type: 'REFERRAL_CREDIT', direction: 'CREDIT', amount: commissionAmount, fee: 0, total: commissionAmount, meta: { referralId: referral.id, referralCommissionId: commission.id, transactionType, transactionId: String(transactionId), rate, amountKobo, commissionAmount } }
    });
    // side-effects outside tx: notification/push/realtime (fire after, best-effort)
    setImmediate(() => {
      prisma.notification.create({ data: { userId: referral.referrerId, type: 'REFERRAL_CREDIT', listingId: null } }).catch(()=>{});
      try { const { sendPushToUser } = require('./push'); sendPushToUser(prisma, referral.referrerId, { title: 'Referral — ₦' + (commissionAmount/100).toLocaleString() + ' credited', body: `Someone you referred made a transaction — ₦${(commissionAmount/100).toLocaleString()} added to your Gig wallet`, url: '/referrals', tag: `referral-credit-${commission.id}` }).catch(()=>{}); } catch {}
      try { const { emitNotification } = require('../realtime'); emitNotification(referral.referrerId, { type: 'REFERRAL_CREDIT' }); } catch {}
    });
    return commission;
  } catch (e) {
    if (e.code === 'P2002') return db.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
    throw e;
  }
}

async function maybeReverseReferral({ transactionType, transactionId, tx }) { /* see ticket 07 */ }

module.exports = { maybeCreditReferral, maybeReverseReferral, generateReferralCode, normalizeReferralCode, resolveReferralCode };
```

### Integration points (exact lines, inside `$transaction`) — updated to include TOKEN per 2026-09-16 request

- **GIG_TOPUP** — `backend/src/controllers/gigPayment.controller.js:55` `creditGigPurchase(purchase, flwId)` transaction (already `prisma.$transaction`): after `tx.user.update gigBalance increment` + `recordWalletMovement TOPUP` (line 62), insert:

```js
await maybeCreditReferral({ referredId: purchase.userId, transactionType: 'GIG_TOPUP', transactionId: purchase.reference, amountKobo: purchase.amount, tx });
```

Hook is inside same `tx`, so webhook retry (`updateMany where status=PENDING` count check) → second call never enters (parent `count !==1`), and even if it did `@@unique` guard prevents second commission.

- **TOKEN** — `backend/src/controllers/payment.controller.js:175` `creditPurchase(purchase, flwId)` — requires wrapping existing guard in `prisma.$transaction` so referral credit is atomic with token credit. Current `creditPurchase` at `payment.controller.js:175` does `updateMany where reference AND status=PENDING` then if `count===1` does `user.update tokenBalance increment` (two statements, not transactional after gigaudit of gig path). For referrals we will make it transactional: `await prisma.$transaction(async (tx) => { const {count}=await tx.tokenPurchase.updateMany(...); if(count!==1) return; await tx.user.update(...); await maybeCreditReferral({referredId: purchase.userId, transactionType:'TOKEN', transactionId: purchase.reference, amountKobo: purchase.amount*100, tx}); })` — note `*100` Naira→kobo. Credit still goes to `gigBalance` (withdrawable), not `tokenBalance` counter. Idempotent via same `updateMany` guard + `@@unique`.

- **GIG** — `backend/src/controllers/gig.controller.js:113` `confirmGig` `$transaction` after `GIG_PAYOUT` (line 130):

```js
await maybeCreditReferral({ referredId: gig.claimerId, transactionType: 'GIG', transactionId: String(id), amountKobo: pay, tx }); // pay = payout (80% net), not escrow
```

Also `gig.controller.js:890` `autoReleaseGigs` cron — same call after `GIG_AUTO_RELEASE` ledger write inside its `tx`.

Commission base is **payout net** (`pay`), not gross `escrowAmount`, so referrer doesn't earn on platform's 20% fee.

- **SERVICE** — `backend/src/controllers/serviceBooking.controller.js:116` `completeServiceBooking` `$transaction` after `SERVICE_PAYOUT` (line 140) when `releaseOk.count===1`:

```js
if (released) await maybeCreditReferral({ referredId: booking.providerId, transactionType: 'SERVICE', transactionId: String(id), amountKobo: booking.amount, tx });
```

Only provider payout qualifies (see ticket 03); booker debit not eligible.

- **buyWithGigBalance** (`payment.controller.js:194` internal conversion `gigBalance → tokenBalance`) — **not eligible**, excluded (internal, no external money in).

### Why `gigBalance` not `tokenBalance`

- `tokenBalance` (`User.tokenBalance Float` `schema.prisma:36`) is a counter for marketplace listing boosts/favorites, not withdrawable money. `gigBalance` (`schema.prisma:37` `Int kobo`) is real Naira already withdrawable via `gig.controller.js:withdrawGig` (PIN, 1% fee, `GigWithdrawal` table, bank `Flutterwave transfer`), already audited via `GigWalletTransaction`. Referrer can `GET /api/gigs/wallet` and withdraw referral earnings without new wallet system — spec's "DO NOT create separate wallet unless genuinely required" satisfied. `recordWalletMovement` transactional `tx` path (`wallet.js:23` `if (tx)`) is reused (or direct `gigWalletTransaction.create` inside caller's `tx` for same atomicity).

### Eligibility order inside helper

`duplicate → referral exists → window active → rate snapshot → amount>0`. Rate snapshot stored per commission (`ReferralCommission.rate`) so history stays at 5% even after `config.referral.rate` later changes to 7%.

### Config

`config.referral.rate` / `durationMonths` from `env.js:38` (ticket 08) — no literal `0.05` in helper. Grep check in CI will fail if literal remains.

Unblocks `Refund Reversal & Expiry`, `User Dashboard`, `Admin & Notifications`.


