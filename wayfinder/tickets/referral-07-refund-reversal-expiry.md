# Refund, Reversal & Six-Month Expiry

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Commission Engine & Wallet Credit`, `Transaction Eligibility`
Blocks: `Admin & Notifications`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
How are referral commissions reversed when an eligible transaction is refunded/reversed/disputed, and how is the six-month earning window enforced?

Decide:

- Reversal trigger points: `Gig` cancel/expired-refund/dispute, `ServiceBooking` cancel/expired/dispute, disputed gig/service admin resolution — which flows already debit/credit via `GigWalletTransaction` and which need a new `ReferralCommission.status = REVERSED` + compensating `GigWalletTransaction DEBIT` on the referrer.
- Window enforcement: query-time check (`referral.commissionEndAt > now()`) vs cron that flips `Referral.status` to EXPIRED; whether commission engine does date math on every call or reads a status column; per-referee independent window (10 referrals = 10 independent `commissionEndAt`).
- Reversal idempotency: `@@unique` on reversal + check `originalCommission.status === CREDITED` before reversing; do not leave invalid commission behind after refund.
- Referrer balance on reversal: decrement `gigBalance` via `recordWalletMovement` DEBIT inside same transaction as status flip; handle insufficient referrer balance (allow negative? clamp to 0? hold as debt?).
- Admin path: disputed transactions held (no commission until resolved) vs reversed after payout.

Grilling + domain-modeling: choose the minimal state machine (ACTIVE → EXPIRED, CREDITED → REVERSED) that covers real repo flows.

---

## Resolution — CLOSED 2026-09-16

**Decision:** **Refund = reverse commission in same `$transaction` that refunds referred user's escrow.** Six-month window enforced by `commissionEndAt` query check + lazy expiry flip; reversal is `CREDITED → REVERSED` with compensating `gigBalance` debit on referrer inside refund tx; insufficient balance clamped to 0 and tracked as debt in `meta`.

### State machines

- `Referral.status`: `ACTIVE → EXPIRED` (one-way). `commissionEndAt` is truth; `status` is index convenience. Engine checks `commissionEndAt < now()` first (ticket 05 helper), cron is optional.
- `ReferralCommission.status`: `CREDITED → REVERSED` (one-way). No `PENDING` needed — commissions only created on terminal `SUCCESS/COMPLETED`, not on intermediate states.

### Reversal triggers (where to call `maybeReverseReferral` inside existing refund tx)

| Refund flow (referred user got money back) | File:line | Refund ledger | When to reverse | Commission to reverse |
|---|---|---|---|---|
| `GIG_TOPUP` failed/refunded via Flutterwave (rare, `status FAILED` before credit) | `gigPayment.controller.js:verifyGigPayment` `status failed` | no ledger (never `SUCCESS`) | **never** — commission never created | — |
| `TOKEN` failed/refunded via Flutterwave (rare, `status FAILED` before credit) | `payment.controller.js:verifyPayment` `status failed` | no ledger (never `SUCCESS`) | **never** — commission never created | — |
| `Gig` `cancel` before claim (poster cancels, 95% refund) | `gig.controller.js:138` `cancelGig` `$transaction` after `GIG_CANCEL_REFUND` | `GIG_CANCEL_REFUND CREDIT` to poster | **do not reverse GIG_TOPUP/TOKEN** — top-up already settled before gig create; cancel refunds poster escrow, not referrer's commission base | — |
| `Gig` `expiredRefund` / `renew` / dispute resolved cancelled | `gig.controller.js:182` / `240` | `GIG_EXPIRED_REFUND` | same as cancel — no reversal of top-up; but if you had commissioned on `GIG_CREATE`, you'd reverse — we don't, so no op | — |
| `Gig` `COMPLETED` then admin disputes/reverses (escrow already paid to claimer, then refunded to poster) | admin resolve path (not yet ticketed, but `gig.controller.js` dispute `DISPUTED`) | admin manual `ADMIN_REFUND` | **reverse `GIG` commission**: call `maybeReverseReferral({type:'GIG', id: String(gigId), tx})` inside admin refund tx after `ADMIN_REFUND` ledger |
| `ServiceBooking` `cancel`/`expired` before confirm (escrow → booker) | `serviceBooking.controller.js:230` `cancelServiceBooking` / `320` `expireServiceBookings` `$transaction` | `SERVICE_REFUND` / `SERVICE_EXPIRED_REFUND` | **no reversal** — `COMPLETED` never happened, so no `SERVICE` commission was created (we only commission on `COMPLETED`, ticket 03) | — |
| `ServiceBooking` `COMPLETED` then disputed → admin refunds provider payout to booker | `serviceBooking.controller.js:completeServiceBooking` already paid `SERVICE_PAYOUT`; admin dispute resolve | `ADMIN_REFUND` to booker + `ADMIN_SPLIT` if needed | **reverse `SERVICE` commission** inside admin tx |
| `GigTokenPurchase` admin-full-refund | admin tool | `ADMIN_REFUND` | reverse `GIG_TOPUP` commission (`type GIG_TOPUP`, id reference) |
| `TokenPurchase` admin-full-refund | admin tool | `ADMIN_REFUND` | reverse `TOKEN` commission (`type TOKEN`, id reference `tt_...`) — only if admin refunds tokens (rare); `Failed` path needs no reversal |

**Key:** For V1, most refunds (cancel/expired before `COMPLETED`) need **no reversal** because commission is only on terminal `COMPLETED`/`SUCCESS`. Reversal only matters for the rare `COMPLETED → REFUNDED` admin path.

### Reversal helper (`backend/src/utils/referral.js:maybeReverseReferral`)

```js
async function maybeReverseReferral({ transactionType, transactionId, tx }) {
  const db = tx || prisma;
  const commission = await db.referralCommission.findUnique({ where: { transactionType_transactionId: { transactionType, transactionId: String(transactionId) } } });
  if (!commission || commission.status !== 'CREDITED') return null; // idempotent: already REVERSED or never existed
  const amount = commission.commissionAmount;
  // flip status first (inside caller's tx)
  const updated = await db.referralCommission.updateMany({ where: { id: commission.id, status: 'CREDITED' }, data: { status: 'REVERSED', reversedAt: new Date() } });
  if (updated.count === 0) return null; // race: someone else reversed
  // debit referrer gigBalance — clamp to 0 if insufficient, record debt
  const referrer = await db.user.findUnique({ where: { id: commission.referrerId }, select: { gigBalance: true } });
  const debit = Math.min(amount, referrer.gigBalance); // clamp
  const debt = amount - debit;
  if (debit > 0) await db.user.update({ where: { id: commission.referrerId }, data: { gigBalance: { decrement: debit } } });
  await db.gigWalletTransaction.create({
    data: { userId: commission.referrerId, type: 'REFERRAL_REVERSAL', direction: 'DEBIT', amount: amount, fee: 0, total: amount,
      meta: { referralId: commission.referralId, referralCommissionId: commission.id, transactionType, transactionId: String(transactionId), reversedAmount: amount, debited: debit, debtKobo: debt, clamped: debt>0 } }
  });
  if (debt > 0) {
    // track debt for admin — don't allow negative gigBalance (Prisma would allow but business forbids)
    // optionally create PlatformProfit negative or just log; admin can see debtKobo in meta
    console.warn(`[REFERRAL REVERSAL DEBT] commission ${commission.id} debt ${debt} kobo for user ${commission.referrerId}`);
  }
  setImmediate(() => {
    prisma.notification.create({ data: { userId: commission.referrerId, type: 'REFERRAL_REVERSED', listingId: null } }).catch(()=>{});
  });
  return updated;
}
```

- **Idempotent:** `updateMany where status=CREDITED` guard + `@@unique` on commission ensures double reversal is no-op.
- **Balance clamp:** Never let `gigBalance` go negative (would break `withdrawGig` `gte` checks `gig.controller.js:293`). Clamp debit to available, store `debtKobo` in ledger meta for admin to chase — ponytail minimal vs allowing negative balance which complicates all other `gte` guards.
- **Ledger:** `REFERRAL_REVERSAL DEBIT` total = original commission amount, so `SUM REFERRAL_CREDIT - SUM REFERRAL_REVERSAL` = net earnings.

### Six-month expiry enforcement

- **Per-referee independent:** `Referral.commissionEndAt` set at creation (ticket 04). 10 referrals → 10 rows, each with own expiry. `maybeCreditReferral` checks `referral.commissionEndAt < now()` before every credit (ticket 05).
- **Query-time + lazy flip:** No need for cron to be correct; engine date math is source of truth. Optional `backend/src/scripts/expireReferralsCron.js` (daily 02:00) runs `updateMany where status=ACTIVE AND commissionEndAt < now() → EXPIRED` for index speed and dashboard card counts. Already `Referral @@index([commissionEndAt])` from ticket 01 supports this.
- **Expiry notification:** Not for V1 — see Not yet specified patch. Dashboard shows countdown (`expires in 23 days`) and `EXPIRED` badge; push on expiry deferred to avoid spam.

Unblocks `Admin & Notifications`.


