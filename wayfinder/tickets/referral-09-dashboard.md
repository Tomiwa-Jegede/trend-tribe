# User Referral Dashboard UX

Label: `wayfinder:prototype` (HITL)
Parent: `wayfinder/referral-program-map.md`
Blocked by: `Referral Data Model`, `Referral Signup Capture Flow`, `Commission Engine & Wallet Credit`
Blocks: `Admin & Notifications`
Status: CLAIMED — resolving 2026-09-16
Assignee: muse-spark

## Question
What does the referral section in the user dashboard/account area look and behave like, consistent with existing Trend Tribe design?

Prototype (cheap, rough, react to it):

- Route: `frontend/src/pages/ProfilePage.jsx` section or new `ReferralPage.jsx` under `frontend/src/pages/` + nav entry in `frontend/src/components/Navbar.jsx` / sidebar.
- UI: referral code + referral link (`/signup?ref=CODE` via `config.clientUrl`), Copy button (clipboard), Share button (Web Share API fallback to copy), stats cards: total referred, active, expired, total earnings, available earnings (from `gigBalance`/`GigWalletTransaction` filter), per-referral row with `commissionEndAt` countdown + ACTIVE/EXPIRED badge, earnings history table (`ReferralCommission` list).
- Data: `GET /api/referrals/me`, `GET /api/referrals/commissions` endpoints shape (aligns with `GigsPage`/`GigWalletPage` patterns).
- Styling: reuse Tailwind from existing pages, `Framer Motion` page transition, `ProtectedRoute` guard, `usePageviewTracking` — no new visual system.
- Empty/error states and loading skeletons.

Call Skill `ui-ux-pro-max` for layout. Link prototype asset from ticket resolution. Keep fidelity low — outline/wireframe sufficient to decide.

---

## Resolution — CLOSED 2026-09-16 (prototype HITL, low fidelity)

**Prototype decision (to apply in build):** New protected route `frontend/src/pages/ReferralPage.jsx` (`/referrals`) plus nav entry, reusing `ProfilePage`/`GigWalletPage` Tailwind patterns, `PageTransition` + `Framer Motion`, `ProtectedRoute` guard, `usePageviewTracking`. No new design system.

### Route & nav

- `frontend/src/App.jsx` — lazy import `const ReferralPage = React.lazy(() => import('./pages/ReferralPage.jsx'))` under `ProtectedRoute` (same as `GigsPage`, `GigWalletPage`). Path `/referrals`.
- `frontend/src/components/Navbar.jsx` — add `Referrals` link with `Gift`/`Users` icon (desktop `hidden md:flex` + mobile drawer), badge shows `activeCount` from `GET /api/referrals/me` (optional, muted to avoid spam).
- `PackageInstall` etc unaffected.

### Endpoints (align with `GigsPage`/`GigWalletPage` pagination patterns)

```
GET /api/referrals/me              → { referralCode, referralLink, canEditCode:true, stats: { total, active, expired }, referrals: [{id, referredUser:{id, username}, status, commissionStartAt, commissionEndAt, earningsKobo, commissionCount}] }
GET /api/referrals/commissions?page&limit → { commissions: [{id, referralId, transactionType, transactionId, amountKobo, commissionAmount, rate, status, createdAt}], pagination, totals: { totalEarnedKobo, availableKobo } }
PATCH /api/referrals/code {code}   → { referralCode, referralLink } — sets custom code (4-12 A-Z0-9, unique, rate-limited)
```

`referralLink = ${config.clientUrl}/signup?ref=${referralCode}` where `config.clientUrl` is `frontend/src/config/env.js` VITE_CLIENT_URL (mirrors `backend/src/config/env.js:50` primaryClientUrl). Available earnings = `SUM(commissionAmount where status=CREDITED) - SUM(commissionAmount where status=REVERSED)` but display `gigBalance` as source of truth (withdrawable); `GigWalletTransaction` filtered by `type=REFERRAL_CREDIT|REFERRAL_REVERSAL`.

### UI sections (Tailwind, consistent with `ProfilePage:20` card `bg-white border rounded-2xl p-5`, `GigWalletPage` stats grid)

1. **Header** — title "Referrals" + subtitle "Invite friends, earn 5% for 6 months".
2. **My referral card** — `referralCode` mono `text-2xl tracking-widest` + `referralLink` `text-sm break-all` + buttons: `Copy link` (clipboard `navigator.clipboard.writeText` with 2s "Copied" toast) + `Share` (`navigator.share({title, url})` if `canShare`, fallback to copy) + **Edit code** (`Set custom code` input 4-12 A-Z0-9 + Save; shows "Your code" + live link preview; error 409 if taken, warning "Old links stop working" on change — per updated ticket 02). Reuse `ProfilePage` copy button style.
3. **Stats grid** — 3-4 cards: `Referred` (total), `Active` (commissionEndAt > now), `Expired`, `Total earnings ₦` (`totalEarnedKobo/100`), `Available ₦` (`gigBalance` slice or computed). Use `GigWalletPage` stat card pattern (`text-xs uppercase text-gray-500` label).
4. **Referrals list** — table or card list per `referral`: `@{username}` · `ACTIVE` green badge or `EXPIRED` gray · `expires 12 Dec 2026` countdown (`commissionEndAt` → "23 days left" / "expired") · `earnings ₦X` + `N commissions`. Empty state: "No referrals yet — share your link".
5. **Earnings history** — paginated table `Date | Referred user | Transaction (GIG_TOPUP gt_123 / GIG #123) | Amount ₦ | Commission ₦ (5%) | Status` with `CREDITED`/`REVERSED`. Filter by `status`, search by referred username. Reuse `GigWalletPage` transaction table.

### States

- **Loading:** `animate-pulse bg-gray-100 h-20 rounded-xl` skeletons (like `ProfilePage`).
- **Empty:** centered illustration + CTA "Copy link" + "How it works" 3-step.
- **Error:** `useQuery` error boundary with retry, toast "Could not load referrals".

### `ui-ux-pro-max` notes applied

- No new color palette — `bg-white border-gray-200` cards, `text-gray-900` headings, `bg-black text-white` primary CTA (matches `HomePage`/`GigsPage`).
- `Framer Motion` `PageTransition` wrapper already in `App.jsx` — wrap `ReferralPage` same as others.
- `Web Share` is progressive enhancement: check `if (navigator.share && navigator.canShare({url}))` else clipboard; both trigger same `copy` toast.
- Pagination `?page&limit` matches `GigsPage` (`skip/take`).

### Wireframe (low fidelity, decision sufficient)

```
[Referrals · Invite friends, earn 5% for 6 months]
[Card: My referral code  K8P2QX  [Copy link] [Share]  link: trendtribe.app/signup?ref=K8P2QX]
[Grid: 2 Referred | 1 Active | 1 Expired | ₦1,250 Total | ₦1,250 Available (gigBalance)]
[List: @jane · ACTIVE · expires 12 Mar 2027 · ₦750 (3 commissions) ]
[Table: 2026-09-15 @jane GIG_TOPUP gt_123 ₦5,000 → ₦250 CREDITED ]
```

Prototype asset: this ticket's wireframe above is the spec; full React file to be created at `frontend/src/pages/ReferralPage.jsx` in build (hit `GET /api/health` + manual flow check, no need for image mock now).

Unblocks `Admin & Notifications` (referral data shapes finalized).

Fog patch "Share-sheet UX details" graduated.


