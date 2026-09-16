# Transaction Eligibility — What Triggers 5%

Label: `wayfinder:research` (AFK)
Parent: `wayfinder/referral-program-map.md`
Blocked by: — (frontier, reads repo)
Blocks: `Commission Engine & Wallet Credit`, `Refund Reversal & Expiry`, `Idempotency & Duplicate Protection`
Status: CLAIMED — resolving 2026-09-16 (research subagent)
Assignee: muse-spark

## Question
Which existing Trend Tribe transaction/payment events should generate a referral commission and which must never?

Investigate the current codebase and surface facts with evidence (file:line):

- Enumerate all value-moving flows: `TokenPurchase` (`backend/src/controllers/payment.controller.js:10` init/verify/webhook + `creditPurchase`), `GigTokenPurchase` (`gigPayment.controller.js`), `Gig` create/claim/confirm/cancel (`gig.controller.js`), `ServiceBooking` book→confirm→complete (`serviceBooking.controller.js`), `GigTransfer`, `GigWithdrawal` — include amount units (Naira vs kobo), status enums, and where `PlatformProfit`/`GigWalletTransaction` is written.
- For each flow, answer: does it represent an eligible "transaction" by the referred user that should trigger 5%? Justify: marketplace purchase vs wallet top-up vs escrow movement vs fee. Flag cancelled/failed/refunded/reversed as non-eligible or reversal-required.
- Identify the exact commit point to hook (e.g. after `creditGigPurchase` increments `gigBalance`, after `confirmGig` payout, after `completeServiceBooking` escrow release) and whether webhook `charge.completed` vs `verifyPayment` is the source of truth.
- Recommend the eligible set for V1 with refund semantics: e.g. `GigTokenPurchase SUCCESS` + `ServiceBooking COMPLETED` + `Gig COMPLETED` eligible; `GigTransfer`/`GigWithdrawal`/`FAILED`/`CANCELLED`/`EXPIRED`/`REFUNDED` not eligible; `DISPUTED` held.

Research via subagent calling Skill `research` against local repo (no external docs). Deliverable: table with evidence links.

---

## Resolution — CLOSED 2026-09-16

**Research findings (evidence-backed, repo reads 2026-09-16).**

### 1. Value-moving flows enumerated

| Flow | File:line | Amount unit | Status enum | Ledger write (`GigWalletTransaction` + `PlatformProfit`) | Movement |
|---|---|---|---|---|---|
| `TokenPurchase` (marketplace tokens via Flutterwave) | `backend/src/controllers/payment.controller.js:10` `initPayment`, `verifyPayment:58`, `handleWebhook:130`, `creditPurchase:175` | Naira (Int, e.g. `amount = qty * 200`) — **not kobo** (see `schema.prisma:97` `amount Int // Naira`) | `PENDING \| SUCCESS \| FAILED` (`schema.prisma:98`) | `creditPurchase` → `user.tokenBalance increment` + `platformProfit TOKEN_SOLD` (gig wallet not touched) `payment.controller.js:175-189` | External → tokenBalance; no `GigWalletTransaction` |
| `GigTokenPurchase` (Gig wallet top-up via Flutterwave) | `backend/src/controllers/gigPayment.controller.js:7` `initGigPayment`, `verifyGigPayment:27`, `creditGigPurchase:55` | **kobo** `Int` (`schema.prisma:341` `amount Int // kobo`, init `amt*100` line 10) | `PENDING \| SUCCESS \| FAILED` (`schema.prisma:342`) | `creditGigPurchase:55` → `user.gigBalance increment` + `recordWalletMovement TOPUP CREDIT` `gigPayment.controller.js:62` | External → gigBalance |
| `Gig` create (poster escrows) | `backend/src/controllers/gig.controller.js:8` | kobo (`amount*100` line 18) | N/A (creates `OPEN`) | `GIG_CREATE DEBIT` `gig.controller.js:29` | gigBalance → escrow (held) |
| `Gig` claim | `gig.controller.js:98` | kobo | `OPEN → CLAIMED` | none (free) | — |
| `Gig` confirm (poster confirms → claimer paid 80/20) | `gig.controller.js:113` `confirmGig` | kobo `payout = amount - fee(0.2)` line 8 | `CLAIMED → COMPLETED` | `GIG_PAYOUT CREDIT` to claimer `gig.controller.js:130` + `platformProfit GIG_CONFIRM_20` line 129 | escrow → claimer gigBalance |
| `Gig` cancel (before claim, 5% fee) | `gig.controller.js:138` | kobo `refund = escrow - 5%` | `OPEN → CANCELLED` | `GIG_CANCEL_REFUND CREDIT` to poster `gig.controller.js:156` + `platformProfit GIG_CANCEL_5` | escrow → poster gigBalance (95%) |
| `Gig` expired refund / renew / dispute / auto-release 72h | `gig.controller.js:182,230,240,890` | kobo | `EXPIRED/CANCELLED/DISPUTED/COMPLETED` | `GIG_EXPIRED_REFUND`, `GIG_AUTO_RELEASE` | escrow → poster or claimer |
| `ServiceBooking` book (booker escrows) | `backend/src/controllers/serviceBooking.controller.js:21` | kobo `Math.round(price*100)` line 17 | `PENDING` | `SERVICE_BOOK DEBIT` to booker `serviceBooking.controller.js:33` | booker gigBalance → escrow |
| `ServiceBooking` confirm (provider pays 20% fee) | `serviceBooking.controller.js:53` `confirmServiceBooking` | kobo `fee = amount*0.2` | `PENDING → CONFIRMED` | `SERVICE_FEE DEBIT` to provider + `platformProfit SERVICE_CONFIRM_20` | provider gigBalance → platform |
| `ServiceBooking` complete (both mark → escrow released to provider) | `serviceBooking.controller.js:116` `completeServiceBooking` | kobo `amount` | `CONFIRMED → COMPLETED` | `SERVICE_PAYOUT CREDIT` to provider `serviceBooking.controller.js:140` | escrow → provider gigBalance |
| `ServiceBooking` cancel/expired/dispute | `serviceBooking.controller.js:230,270,320` | kobo | `PENDING→CANCELLED/EXPIRED`, `CONFIRMED→DISPUTED` | `SERVICE_REFUND` / `SERVICE_EXPIRED_REFUND` CREDIT to booker | escrow → booker |
| `GigTransfer` (peer transfer) | `backend/src/controllers/gig.controller.js:530` | kobo + fee 5000/10000 | `SUCCESS` | `TRANSFER DEBIT` sender + `TRANSFER CREDIT` recipient `gig.controller.js:566` | gigBalance → gigBalance |
| `GigWithdrawal` (bank out) | `gig.controller.js:260` | kobo + 1% fee | `PENDING→COMPLETED/REJECTED` | `WITHDRAW DEBIT` sender, `WITHDRAW_REFUND CREDIT` on reject | gigBalance → bank |

Token-gig bridge `buyWithGigBalance` (`payment.controller.js:194`) is `gigBalance decrement` + `tokenBalance increment` + `TOKEN_BUY DEBIT` — an internal conversion, not external value-in.

### 2. Eligibility analysis (referrer earns 5% of referred user's transaction)

**Principle:** Commission should reward *referred user spending external or platform-fee-generating value*, not internal escrow shuffling or movements the referred user didn't initiate. Failed/cancelled/expired must never credit; refunds must reverse.

| Flow (as performed by **referred user**) | Eligible? | Why | Commission base |
|---|---|---|---|
| `GigTokenPurchase SUCCESS` (Flutterwave `charge.completed` with `gt_` prefix) | **YES — primary** | External money in (user loads wallet). This is the fundable event analogous to "purchase" in spec. `creditGigPurchase:55` is idempotent (`updateMany where status=PENDING`) and increments `gigBalance` with ledger. | `amountKobo` (kobo top-up) |
| `Gig COMPLETED` where **referred user is claimer** (earned via `confirmGig:113` or auto-release) | **YES** | Referred user did work, earned payout — platform took 20% fee. Value is meaningful. Hook after `GIG_PAYOUT` credit. Do NOT commission on `GIG_CREATE` (poster escrow is cost, not revenue). | `payout` (kobo actually credited) or `escrowAmount`? Recommend `payout` (80% net) to avoid commission on platform fee. Decision point for engine ticket. |
| `ServiceBooking COMPLETED` where **referred user is provider** (provider receives escrow after both complete) | **YES** | Provider earned fee-bearing payout, platform took 20% on confirm. Hook after `SERVICE_PAYOUT CREDIT` `serviceBooking.controller.js:140`. | `amountKobo` (escrow released) |
| `ServiceBooking CONFIRMED` fee debit from provider (if referred user is provider) | **NO** — fee, not revenue | Provider *pays* 20% fee on confirm; commission on a debit is nonsensical. Only the later payout qualifies. |
| `Gig` `GIG_CREATE` debit / `ServiceBooking` `SERVICE_BOOK` debit where referred is poster/booker | **NO** | That's escrow hold (cost), not completed transaction. Commission on hold would double-count when later refunded/payout. |
| `TokenPurchase` (marketplace tokens via Flutterwave) | **YES — per user request (updated 2026-09-16)** | External money in (user buys listing tokens). Despite touching `tokenBalance` not `gigBalance` (`payment.controller.js:175` increments `tokenBalance`), referrer still earns in **Gig Wallet (kobo)**. Amount Naira → converted kobo (`amount Naira *100`). Hook after `creditPurchase` SUCCESS. | `amountKobo = purchase.amount *100` (kobo converted from Naira) |
| `GigTransfer` sent/received where referred is sender | **NO** | Peer transfer (`gig.controller.js:530`) is internal redistribution, not platform revenue; easy to game (referrer and referred ping-pong). |
| `GigTransfer` where referred is **recipient** | **NO** | Recipient gets free money; not a transaction the referred user performed. |
| `GigWithdrawal` / `buyWithGigBalance` internal conversion | **NO** | Money out or token conversion, not eligible spend. |
| Any `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED` | **NO** — and if previously credited, must reverse | Spec requires cancelled/failed never generate. See `gig.controller.js:156` cancel 5% fee — escrow refunded. |
| `DISPUTED` (Gig `DISPUTED` / Service `DISPUTED`) | **HELD** — don't credit until `COMPLETED`; if already credited and dispute refunds, reverse | Prevents gaming via dispute farming. |
| `OPEN/CLAIMED/PENDING/CONFIRMED` intermediate | **NO** — only terminal `SUCCESS/COMPLETED` | Escrow still held; value not settled. |

**Recommended V1 eligible set (4 events) — updated per user request to include TokenPurchase:**
1. `GIG_TOPUP` — `GigTokenPurchase` `SUCCESS` (`gigPayment.controller.js:creditGigPurchase` after `gigBalance` increment, `status PENDING→SUCCESS`) — amount = `purchase.amount` kobo.
2. `TOKEN` — `TokenPurchase` `SUCCESS` (`payment.controller.js:creditPurchase` after `tokenBalance` increment, `status PENDING→SUCCESS`) — amount = `purchase.amount *100` kobo (Naira→kobo conversion). Referrer credit still goes to `gigBalance`.
3. `GIG` — `Gig` `COMPLETED` where `claimerId == referredId` — hook inside `confirmGig` `$transaction` after `GIG_PAYOUT` / inside `autoReleaseGigs` after `GIG_AUTO_RELEASE` (`gig.controller.js:907`).
4. `SERVICE` — `ServiceBooking` `COMPLETED` where `providerId == referredId` — hook inside `completeServiceBooking` after `SERVICE_PAYOUT`. Only provider COMMISSIONABLE (ticket 05).

### 3. Exact hook points (idempotent, inside `$transaction`)

- `GIG_TOPUP`: `backend/src/controllers/gigPayment.controller.js:55` `creditGigPurchase` — inside `prisma.$transaction` after `tx.user.update gigBalance increment` and `recordWalletMovement TOPUP` (line 62) — call `maybeCreditReferral({referredId: purchase.userId, type:'GIG_TOPUP', id: purchase.reference, amountKobo: purchase.amount, tx})` before transaction commit. Source of truth is **webhook `charge.completed` with `gt_` prefix** (`gigPayment.controller.js:handleGigWebhook` + `payment.controller.js:handleWebhook:145` `tx_ref startsWith gt_`) AND `verifyGigPayment` — both funnel through same `creditGigPurchase` guarded by `updateMany where status=PENDING` (`gigPayment.controller.js:58` `count !==1`), so idempotent.
- `TOKEN`: `backend/src/controllers/payment.controller.js:175` `creditPurchase` — inside `$transaction`-guarded `updateMany where reference=tt_... AND status=PENDING` (line 178 `count===1`) after `tx.user.update tokenBalance increment` — call `maybeCreditReferral({referredId: purchase.userId, type:'TOKEN', id: purchase.reference, amountKobo: purchase.amount *100, tx})` (Naira→kobo). Source of truth webhook `charge.completed` non-gt prefix (`payment.controller.js:150`) AND `verifyPayment:58` — both funnel through same `creditPurchase` idempotent guard.
- `GIG`: `backend/src/controllers/gig.controller.js:113` `confirmGig` `$transaction` after `GIG_PAYOUT` (line 130) + `backend/src/controllers/gig.controller.js:890` `autoReleaseGigs` cron after `GIG_AUTO_RELEASE`. Both are already atomic (`updateMany where status=CLAIMED`).
- `SERVICE`: `backend/src/controllers/serviceBooking.controller.js:116` `completeServiceBooking` `$transaction` after `SERVICE_PAYOUT CREDIT` (line 140) when `fresh[otherField]` both marked and `releaseOk.count===1`.

Webhook vs verify: **webhook is source of truth for top-ups** (server-to-server, `verif-hash` check `gigPayment.controller.js:handleGigWebhook:72`), but verify path must also be safe — `creditGigPurchase`'s `updateMany` guard makes either path win once, referral hook lives inside that same transaction so it also wins once.

### 4. Refund/reversal triggers (to be implemented in ticket 07, summarized here)

- `Gig` `cancel` (`GIG_CANCEL_REFUND`), `expiredRefund` (`GIG_EXPIRED_REFUND`), `withdraw reject` (`WITHDRAW_REFUND`), `ServiceBooking` `cancel`/`expired` (`SERVICE_REFUND`/`SERVICE_EXPIRED_REFUND`) where refund was after a commission had been credited → **reverse** via `ReferralCommission REVERSED` + compensating `REFERRAL_REVERSAL DEBIT` on referrer inside same refund transaction.
- `FAILED` (Flutterwave `status failed`) never reaches `$transaction` (update to `FAILED` only) → no hook, no commission.
- `DISPUTED → RESOLVED COMPLETED` → credit then; `DISPUTED → RESOLVED CANCELLED` → don't credit / reverse if already.

### 5. Trace example

User B (referred by A) does `GigTokenPurchase gt_123 50000 kobo` → webhook `creditGigPurchase` increments B `gigBalance 50000` → inside tx `ReferralCommission {referralId: A→B, transactionType: GIG_TOPUP, transactionId: gt_123, amountKobo:50000, rate:0.05, commissionAmount:2500}` + `User A gigBalance +2500` + `GigWalletTransaction CREDIT REFERRAL_CREDIT meta {referralCommissionId, transactionType, transactionId}`. Admin traces via `Commission.transactionId → PlatformProfit → WalletTransaction`.

Delivered to unblock `Commission Engine`, `Idempotency`, `Refund Reversal`.


