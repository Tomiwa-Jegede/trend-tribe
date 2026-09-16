# Admin Visibility, Notifications & Abuse Guards

Label: `wayfinder:grilling` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Commission Engine & Wallet Credit`, `Referral Signup Capture Flow`, `Refund Reversal & Expiry`
Blocks: — (terminal)
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
How are referrals visible to admins, notified to users, and protected against abuse using existing systems?

Decide:

- Admin: extend `backend/src/routes/admin.routes.js` + `frontend/src/pages/AdminDashboardPage.jsx` / `AdminUsersPage.jsx` to show totals (active/expired), referral relationships per user, commission per transaction, commission history table with filters — reuse existing admin guards (`AdminRoute`, `admin.middleware.js`). Indexes needed for admin queries.
- Notifications: integrate with existing `Notification` (`backend/src/controllers/notification.controller.js` types) + `push.js` + `realtime.js` (`emitNotification`) — events: "You've successfully referred a new user" (on `Referral` creation) and "Someone you referred made a transaction — ₦X credited" (on commission credit); skip building new notification system; choose whether expiry notification is needed (see Not yet specified).
- Abuse prevention (reuse existing auth/validation, don't create new system): self-referral `referrerId !== referredId`, one referrer per user `@@unique([referredId])`, immutable after signup (no endpoint to change), duplicate commission `@@unique` on commission, invalid/fake code handling, failed/cancelled/refunded not eligible, webhook retry safe via ticket 06, rate-limit referral code generation (reuse `rateLimit.js`).
- Investigation path: how admin traces "Why did user get ₦X?" via `ReferralCommission.meta` → `GigWalletTransaction` → `Transaction`.

Grilling + domain-modeling: weigh which events are worth a push (credit yes, expiry maybe) to avoid notification spam.

---

## Resolution — CLOSED 2026-09-16 (terminal)

**Decision:** Admin extends existing `AdminDashboard`/`AdminUsers` with referral stats + `GET /api/admin/referrals` endpoints reusing `admin.middleware.js` + `AdminRoute`; notifications reuse `Notification` + `push.js` + `realtime.js` with two push events (`REFERRAL_NEW_USER` on `Referral` create, `REFERRAL_CREDIT` on commission) and no expiry push for V1; all abuse guards reuse existing DB constraints + `rateLimit.js`, no new anti-abuse system.

### Admin visibility (reuse existing guards — no new auth)

- **Guards:** All admin routes under `backend/src/routes/admin.routes.js:protect + admin` (`admin.middleware.js` checks `role===ADMIN`) + frontend `AdminRoute` (`frontend/src/App.jsx` `role==='ADMIN'` guard) — no new middleware.
- **Backend (`backend/src/routes/admin.routes.js` + `backend/src/controllers/adminReferral.controller.js` new but thin):**

```
GET /api/admin/referrals/stats
  → { totalReferrals, active, expired, totalCommissionsKobo, totalCommissionsCount, netCommissionsKobo (CREDITED - REVERSED) }
  query: SELECT count(*) FROM referrals, count where status ACTIVE/EXPIRED, SUM commissionAmount

GET /api/admin/referrals?search&status&page&limit
  → { referrals: [{id, referrer:{id,username,email}, referred:{id,username,email}, referralCode, commissionStartAt, commissionEndAt, status, commissionsCount, earningsKobo }], pagination }
  search by referrer.username/email or referred.username/email or referralCode; status filter ACTIVE|EXPIRED

GET /api/admin/referrals/:referralId/commissions
  → { commissions: [{id, transactionType, transactionId, amountKobo, commissionAmount, rate, status, createdAt, reversedAt}], pagination }

GET /api/admin/referrals/commissions?transactionType&search&page&limit
  → flat commission history with filters transactionType GIG_TOPUP/GIG/SERVICE, status CREDITED/REVERSED
```

- **Indexes for admin (from ticket 01 schema):** `referrals @@index([referrerId,status])`, `@@index([commissionEndAt])`, `referral_commissions @@index([referrerId,createdAt])`, `@@index([referralId])` — plus `User @unique(referralCode)` + `PendingRegistration` no index needed. Add `@@index([status, createdAt])` on `Referral` if admin sorts by `createdAt` (optional, not blocking).
- **Frontend:** extend `AdminDashboardPage.jsx` cards (reuse existing `stats` grid: totalReferrals/active/expired/totalCommissions) + `AdminUsersPage.jsx` column or `AdminReferralsPage.jsx` new admin page (lazy, `AdminRoute`) with table mirroring `AdminWithdrawalsPage` pattern (search box, status filter dropdown, pagination). Detail drawer per referral shows commissions list + per-transaction trace link.

### Notifications (reuse `Notification` + `push.js` + `realtime.js`, no new system)

Existing stack: `Notification {userId, actorId, listingId, type, read}` (`schema.prisma:180` `@@index([userId,read])`), `backend/src/utils/push.js:sendPushToUser`, `backend/src/realtime.js:emitNotification` + `isOnline` check (used in `payment.controller.js:buyWithGig` and `gig.controller.js:confirmGig` push). No new table.

**Events:**

1. **Referral created** — inside `verifyRegistration` `$transaction` after `Referral.create` (ticket 04): `await prisma.notification.create({data:{userId: referrer.id, actorId: newUser.id, type:'REFERRAL_NEW_USER'}})`; after tx `sendPushToUser(referrer, {title:'You referred a new user', body:`@${newUser.username} just signed up with your referral`, url:'/referrals', tag:`referral-new-${referral.id}`})` + `emitNotification(referrer, {type:'REFERRAL_NEW_USER'})`. In-app bell shows via `NotificationBell.jsx`.
2. **Commission credited** — inside `maybeCreditReferral` after `ReferralCommission` create (ticket 05): `Notification type:'REFERRAL_CREDIT'` + push `Someone you referred made a transaction — ₦X credited to your Gig wallet` (`gigPayment.controller.js:62` pattern) with `tag: referral-credit-${commission.id}` + realtime emit. Webhook path also pushes but deduped by `commission` existence.
3. **Reversal** — `type:'REFERRAL_REVERSED'` (ticket 07) — push muted (no spam) but bell entry created.
4. **Expiry — NOT for V1:** No push on `commissionEndAt` passing. Reason: 10 referrals expiring over months would spam; dashboard countdown + `EXPIRED` badge covers it. If later needed, add daily cron batch push (one per day max) — but rule out for V1 (see Out of scope).
- **Push dedup:** `tag: referral-credit-${commission.id}` collapses duplicates if provider retries; `isOnline` check already in `wallet.js:recordWalletMovement` pattern — skip native push when `isOnline(referrer)`.

### Abuse prevention (reuse existing auth/validation, ponytail minimal)

| Abuse | Guard | Evidence |
|---|---|---|
| Self-referral | `referrer.email === pending.email` → 400 in `register` + `verifyRegistration` (ticket 04) | app check + `referrerId !== referredId` invariant |
| Multiple referrers / changing referrer | `Referral.referredId @unique` DB (`schema.prisma` ticket 01) + no update endpoint | `P2002` on second create; no `PATCH /referrals` exists |
| Duplicate commission | `ReferralCommission @@unique([transactionType,transactionId])` + `findUnique` before insert (ticket 06) | `P2002` even if race |
| Invalid/fake code | `resolveReferralCode` returns null → explicit body 400, silent link ignore (ticket 02/04) | no referral created |
| Fake/invalid transaction generating commission | Hook only after `status SUCCESS/COMPLETED` inside `$transaction` (ticket 03/05); `FAILED/CANCELLED` never creates `ReferralCommission` | `creditGigPurchase` guard `status PENDING→SUCCESS` |
| Failed/cancelled generating commission | Excluded by eligible set (ticket 03) — only terminal `SUCCESS/COMPLETED` | — |
| Refund leaves invalid commission | `maybeReverseReferral` in same refund tx (ticket 07) flips `CREDITED→REVERSED` + debit | `updateMany where status=CREDITED` guard |
| Webhook retry double commission | `@@unique` + parent `updateMany where status=PENDING` (`gigPayment.controller.js:58`) | second webhook is 200 but no second row |
| Code manipulation / guessing | 6-char space 2B, rate-limited by `authLimiter`/`otpLimiter` on `register`/`verify-registration` (`auth.routes.js`), lookup is `findUnique` indexed (cheap) | reuse `rateLimit.js` |
| Referrer farming (colluding referred + referrer) | Commission only on real value (`GIG_TOPUP` external money or `GIG`/`SERVICE` fee-bearing payout) — peer transfers/withdraws not eligible (ticket 03); admin can trace via `referral_commissions` flat history + `GigWalletTransaction` meta | admin investigation path |

No new CAPTCHA or device fingerprint — campus marketplace threat model is low; DB constraints + rate limit sufficient for V1.

### Investigation path "Why did user get ₦X?"

Admin opens `GET /api/admin/referrals/commissions?search=A` → finds `ReferralCommission {id, transactionType: GIG_TOPUP, transactionId: gt_123, amountKobo:50000, commissionAmount:2500, rate:0.05, referralId}` → join `Referral {referrerId A, referredId B}` → `GigTokenPurchase {reference gt_123, userId B, amount 50000, status SUCCESS}` → `GigWalletTransaction {userId A, type REFERRAL_CREDIT, amount 2500, meta.referralCommissionId}`. Single trace without `meta` parsing.

### Fog patches graduated

- "Whether to notify referrer on expiry" → decided: **no push for V1**, dashboard badge only.
- "Exact admin query shapes" → decided: four endpoints above + indexes.

Closes terminal ticket. Map way-to-destination is now fully charted.


