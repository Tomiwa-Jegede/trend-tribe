# Idempotency & Duplicate Protection

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Transaction Eligibility`
Blocks: `Commission Engine & Wallet Credit`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
How is the system guaranteed to never create two referral commissions for the same transaction, even under webhook retry or `verify` vs `webhook` race?

Decide:

- DB-level guard: `@@unique([transactionType, transactionId])` or `@@unique([referralId, transactionId])` on `ReferralCommission` plus application-level `updateMany` guard inside transaction — which field(s) to unique.
- Engine-level guard: `findExistingCommission` check inside the same `$transaction` that does the credit, and early return on duplicate; map transaction discriminator to canonical id (`TokenPurchase.reference`, `Gig.id`, `ServiceBooking.id`, `GigTokenPurchase.reference`).
- Webhook/verify parity: same `creditPurchase`/`creditGigPurchase` idempotency pattern (`updateMany where status=PENDING` count===1) already in `backend/src/controllers/payment.controller.js:creditPurchase` and `gigPayment.controller.js:creditGigPurchase` — referral commission must not double-create when those two paths race.
- Tracing: every commission stores `transactionType + transactionId + referralId + rate + amountKobo` for audit ("Why did user get ₦X?").
- Test strategy: simulated double webhook + double verify in `npm test`.

Grilling + domain-modeling: decide the single unique constraint that makes duplicates impossible even if app code has a bug.

---

## Resolution — CLOSED 2026-09-16

**Decision:** **DB-level `@@unique([transactionType, transactionId])` on `ReferralCommission`** (from ticket 01 schema) is the single source of truth — even if app code bugs, second insert for same transaction fails `P2002`. Engine also does early `findUnique` inside same `$transaction` that credits, but DB guard is what makes webhook retry + `verify` vs `webhook` race safe. Discriminator makes audit unambiguous.

### Discriminator → canonical `transactionId` mapping

| `transactionType` | Source table / hook | Canonical `transactionId` (stored as `String`) | Eligible check |
|---|---|---|---|
| `GIG_TOPUP` | `GigTokenPurchase.reference` (`gt_*`) | `purchase.reference` (`String cuid` with `gt_` prefix, `schema.prisma:339`) | inside `creditGigPurchase` |
| `TOKEN` | `TokenPurchase.reference` (`tt_*`) | `purchase.reference` (`String cuid` with `tt_` prefix, `schema.prisma:94`) | inside `creditPurchase` (Naira→kobo `*100`) |
| `GIG` | `Gig.id` | `String(gig.id)` (Int autoincrement `schema.prisma:313`) | inside `confirmGig` / `autoReleaseGigs` after `GIG_PAYOUT` |
| `SERVICE` | `ServiceBooking.id` | `String(booking.id)` (`schema.prisma:388`) | inside `completeServiceBooking` after `SERVICE_PAYOUT` |

Why `String(transactionId)`? `Gig`/`ServiceBooking` are Int while `GigTokenPurchase` is cuid String — union type must be String column for `@@unique` to work across types.

### Engine idempotency (inside `backend/src/utils/referral.js:maybeCreditReferral`)

```js
async function maybeCreditReferral({ referredId, transactionType, transactionId, amountKobo, tx }) {
  // tx is the Prisma transaction client from caller (payment/gig/service tx) — commission lives in same tx
  const existing = await tx.referralCommission.findUnique({
    where: { transactionType_transactionId: { transactionType, transactionId } }
  });
  if (existing) return existing; // already credited — idempotent return

  const referral = await tx.referral.findUnique({ where: { referredId } });
  if (!referral || referral.commissionEndAt < new Date() || referral.status === 'EXPIRED') return null;

  const rate = require('../config/env').referral.rate; // 0.05 from env.js
  const commissionAmount = Math.floor(amountKobo * rate); // integer kobo, no float
  if (commissionAmount <= 0) return null;

  // Try insert — DB unique is the final guard. If two concurrent callers both passed the findUnique
  // check (race), one will succeed, the other hits P2002 and we return the winner.
  try {
    const commission = await tx.referralCommission.create({
      data: { referralId: referral.id, referrerId: referral.referrerId, referredId, transactionType, transactionId, amountKobo, rate, commissionAmount, status: 'CREDITED' }
    });
    // credit wallet + ledger in same tx (see ticket 05)
    await tx.user.update({ where: { id: referral.referrerId }, data: { gigBalance: { increment: commissionAmount } } });
    await tx.gigWalletTransaction.create({
      data: { userId: referral.referrerId, type: 'REFERRAL_CREDIT', direction: 'CREDIT', amount: commissionAmount, fee: 0, total: commissionAmount, meta: { referralId: referral.id, referralCommissionId: commission.id, transactionType, transactionId, rate, amountKobo } }
    });
    return commission;
  } catch (e) {
    if (e.code === 'P2002') {
      // another caller won the race — fetch and return it
      return tx.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId } } });
    }
    throw e;
  }
}
```

### Why not `@@unique([referralId, transactionId])`?

That would allow same `gt_123` to be credited twice if code bug creates two referrals for same referred user (before DB constraint) or if `transactionId` space overlaps across types (e.g. `Gig.id=123` and `ServiceBooking.id=123` would be different referrers but same numeric string). Type discriminator prevents cross-type collision and makes trace "Why ₦X? → `GIG_TOPUP gt_123`" unambiguous without joining.

### Webhook/verify parity with existing `payment.controller.js:creditPurchase` pattern

- `creditGigPurchase` already guards `updateMany where reference=gt_123 AND status=PENDING` (`gigPayment.controller.js:58` `count !==1` → early return). Webhook `handleGigWebhook:72` checks `verif-hash`, verify `verifyGigPayment:27` checks Flutterwave status + amount. Both funnel through same `creditGigPurchase` transaction.
- Referral hook lives **inside** that same transaction (`tx` param), so it inherits the `count===1` win. Webhook and verify racing → one tx wins `updateMany`, the other returns early without calling `maybeCreditReferral` (since caller checks `count`). Even if both somehow enter (e.g. `GIG`/`SERVICE` have no `updateMany` guard), `ReferralCommission @@unique` still makes second insert fail.
- `creditPurchase` for `TokenPurchase` (`payment.controller.js:175`) now **included** per 2026-09-16 update — same `updateMany where reference=tt_... AND status=PENDING` guard applies, now wrapped in `$transaction` for atomic referral credit (see ticket 05).

### Tracing for audit

Every commission stores `transactionType + transactionId + referralId + referrerId + referredId + amountKobo + rate + commissionAmount`. Ledger `GigWalletTransaction.meta` mirrors `transactionType, transactionId, referralCommissionId`. Admin query: `SELECT * FROM referral_commissions WHERE transactionType='GIG_TOPUP' AND transactionId='gt_123'` → `referrerId A, referredId B, 2500 kobo`. No join needed for "Why did A get ₦25?" but joins remain for richer history.

### Test strategy (for build `npm test` Playwright + unit)

- Unit: call `maybeCreditReferral` twice with same `(GIG_TOPUP, gt_123)` in parallel `Promise.all` — assert one `CREDITED` row, one `P2002` retry returns same row, `gigBalance` only +2500 once.
- Webhook: simulate two `POST /api/payments/webhook` with same `tx_ref=gt_123` and `verif-hash` (`payment.controller.js:handleWebhook:130`) — second is 200 but no second commission.
- `verify` vs `webhook` race: fire `GET /api/gig-payments/verify?reference=gt_123` and webhook POST concurrently — still one commission.

Closes ticket. Unblocks `Commission Engine`.


