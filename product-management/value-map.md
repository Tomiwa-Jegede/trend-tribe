# Value Map — Value to Deliver

> Canonical value artifact for Trend Tribe. Tracks what value is delivered, to whom, and how it is proven — separately from how engineering delivers it (`delivery-management/`).
> Re-audited 2026-09-01 via [Wayfinder Map — Seller/Buyer Real Pain](https://github.com/Tomiwa-Jegede/trend-tribe/issues/1) — 7 decisions closed, buyer trust first.

## How to read this map

- A value outcome is delivered only when a stakeholder can feel it
- Status is value status, not engineering status
- Each row carries a stable Outcome ID (e.g. `V1`) that delivery milestone trackers reference as their proof-of-value target
- Each row names the owning delivery milestone(s) and the must-not-fail promise

## Value by stakeholder

| Outcome ID | Stakeholder | Value to deliver | Visible moment | Proof measure | Status | Owning delivery | Must-not-fail promise |
|---|---|---|---|---|---|---|---|
| V1 | Student (new/returning) | Register, verify via OTP, log in securely, and manage a trusted profile | Registers -> receives Brevo OTP -> verifies at `/verify-registration` -> logs in and sees `/profile/:id` -> edits bio/whatsapp/avatar; can reset via `/forgot-password` | Register-verify-login completes in under 2 min; `POST /api/auth/verify-otp` returns JWT; `GET /api/auth/me` 200 with JWT; `GET /api/health` DB Connected | DELIVERED | Milestone 1 | OTP cannot be bypassed; passwords hashed with bcryptjs; JWT required for all protected routes; `PendingRegistration` cleanup within 10 min |
| V2 | Student Seller | Create, edit, and remove listings with photos and accurate metadata — incl. `SERVICES` (1 free + 1 token per extra) + `HAIR_AND_WIGS` under `BEAUTY_AND_PERSONAL_CARE`, Boost x1 (1 token top 5) / x2 (2 tokens Picks guaranteed) | Creates listing at `/create-listing` (3 images free, 0.5 per extra) with `Category`/`Condition`/`Subcategory` -> sees it on `/marketplace` (Picks featured before category, top 5) and `/listings/:id`; edits at `/listings/:id/edit` or deletes own listing; manages at `/my-listings` (GHOST badge, Hide/Re-activate, Boost x1/x2, Re-boost) | `POST /api/listings` with `Multer+Cloudinary` succeeds; `boostTier` 1/2 + `boostedUntil` 24h + Picks `?picks=true`; `GET /api/listings/me` returns `_count.favorites`; Playwright create-listing + edit-listing + smoke `/my-listings` specs pass | DELIVERED | Milestone 2 + Milestone 5 + Boost/Services/Hair | `Listing.images` + `imagePublicIds` stay in sync; unauthorized edit/delete returns 403; `Price` Decimal(10,2) ≤₦50k for SERVICES; `Category` includes `SERVICES` |
| V3 | Student Buyer | Browse, filter, and inspect items quickly | Filters `/marketplace` by `Category`/`Condition`/price and opens `/listings/:id` to see gallery, price, condition, location, seller card | Filter returns in under 1s for 100 listings; detail page renders gallery + seller link in under 1.5s; category enums match `prisma/schema.prisma`; 30d ghost prune keeps marketplace fresh (`isAvailable` + `archivedAt`) | DELIVERED | Milestone 2 + Milestone 5 (ghost prune) | Marketplace pagination correct; sold/unavailable listings excluded by `isAvailable`; SEO + Helmet titles via `react-helmet-async` |
| V4 | Student (engaged) | Save items and report suspicious listings | Taps Save -> sees item in `/saved`; taps Report -> picks `ReportReason` -> sees confirmation toast | `POST /api/listings/:id/favorite` and `POST /api/listings/:id/report` succeed; `@@unique [listingId,userId]` enforced; `GET /saved` and `GET /api/listings/favorites` reflect state | DELIVERED | Milestone 3 | Duplicate favorite/report prevented by unique constraint; report `status` defaults to `PENDING` with index on `status` |
| V5 | Administrator | Moderate listings, reports, and users to keep the campus safe | Logs in as `ADMIN` -> sees `/admin` dashboard -> acts on `/admin/reports`, `/admin/listings`, `/admin/users` | `GET /api/admin/reports` lists `PENDING`; `PATCH /api/admin/reports/:id` updates to `IGNORED`; non-`ADMIN` JWT gets 403; Playwright admin spec passes | DELIVERED | Milestone 3 | Every `/api/admin/*` gated by `ADMIN` role middleware; cascade deletes on report/listing respect FK constraints |
| V6 | Student (assisted) | Get contextual AI help for discovery and styling without breaking the trust loop | Opens `FrederickWidget` (Jegede) -> asks style/price question or `update` for strategist briefing -> receives answer within token budget -> sees `aiUsesRemaining` decrement | `POST /api/frederick/chat` (shopper) + `POST /api/jegede/update` (strategist, admin, 30s timeout, keep-alive ping) gated by `tokenBalance`/`aiUsesRemaining` | DELIVERED | Milestone 3 | No Frederick/Jegede call bypasses token check; session cost deducted atomically; no PII leaks to LLM provider |
| V7 | Student (paying) | Top up tokens + Gig Naira securely via local payment | Initiates token purchase -> Flutterwave checkout -> returns to `/tokens/callback` with success and `tokenBalance` increased; Gig wallet top-up `POST /api/gigs/payments/init` → `GigTokenPurchase` → `gigBalance` (kobo, Naira display) | `POST /api/payments/init` creates `TokenPurchase` `PENDING` with unique `reference` (`tt_`); `POST /api/gigs/payments/init` creates `GigTokenPurchase` (`gt_`) with `amount` kobo; verified `POST /api/payments/webhook` (`express.raw`, `verif-hash`) flips to `SUCCESS` and increments correct wallet; `TokenCallbackPage` confirms | DELIVERED | Milestone 4 | Token/Gig increment only inside hash-verified webhook (`FLUTTERWAVE_SECRET_HASH`); `reference` unique; `amount` kobo; never increment on client callback alone |
| V9 | Student (gig worker / booker) | Post, claim, and get paid for gigs & service bookings with escrow + wallet transfer | Posts gig at `/gigs` (description + per-gig WhatsApp + amount Naira + timer, escrow from `gigBalance`) -> claimed free (gets WhatsApp) -> Confirm releases 80% to claimer (20% platform fee), cancel 5% before claim, auto 72h release, wallet transfer via 10-digit account + 4-digit PIN (1% fee); Books service at `/listings/:id` `SERVICES` (1h timer, provider Confirm pays 20% fee, escrow refund) -> sees at `/bookings` | `POST /api/gigs` escrow deduct, `POST /api/gigs/:id/claim` free, `POST /api/gigs/:id/confirm` 80/20, `POST /api/gigs/transfer` 10-digit + PIN 1%, `GET /api/gigs/account` 809..., `POST /api/services/listings/:id/book` 1h + 20% fee | DELIVERED | Boost/Services/Gigs (Wayfinder Map #16) | Gig wallet isolated from marketplace tokenBalance (no conversion), `gigBalance` kobo, escrow held `Gig.escrowAmount`, `GigTransfer` audit, `ServiceBooking` 1h expiry auto-refund, PIN bcrypt, `gigAccountNumber` unique 10-digit, rateLimit on transfer/resolve |
| V8 | Campus visitor / prospective student | Understand and trust the platform before joining | Visits `/` -> sees categories, features, and CTA; navigates to `/about`, `/faq`, `/privacy`, `/terms`, `/features` | GA4 `gtag page_view` fires on SPA navigation via `usePageviewTracking`; Home renders in under 2s; canonical + OG tags via `Helmet` | DELIVERED | Milestone 4 | Netlify frontend deploys keep routes working; 404 handled by `NotFoundPage`; static pages not behind auth |

> **Re-audit note (Wayfinder #1, 2026-09-01 → 2026-09-04 delivered):** V2/V3 moved PARTIAL → DELIVERED — `GET /api/listings/me` + `MyListingsPage.jsx` GHOST badge/toggle/boost live at `/my-listings`, 30d ghost prune (`soldAt`/`archivedAt` + `isAvailable=false`) running at `backend/src/index.js:128` and verified `GET /api/health` 200. 5% repeat sellers now have prune home; proxy remains **WhatsApp tap rate on live listings** for 14d lift check.

## Cross-cutting value gaps

1. **Buyer trust handoff is DELIVERED (proxy)** — `/listings/:id` free `whatsapp` handoff stays at `backend/src/controllers/listing.controller.js:576` + ghost prune keeps taps on live listings; `Conversation`/`Message` thread parked per Wayfinder #4 — true inquiry-to-reply rate deferred, proxy is tap on live. Re-opens as thread-lite only if 14d tap-rate lift fails.
2. **My Listings is DELIVERED** — shipped at `frontend/src/pages/MyListingsPage.jsx` (GHOST badge, `isAvailable` toggle, `GET /api/listings/me` + boost); prototype at `MyListingsPage.prototype.jsx` retained as asset. Notifications remain GAP — `/notifications` still `ComingSoonPage`; parked per Wayfinder #1 Out of scope.

## Sequencing principle

- Every delivery milestone must make a named stakeholder feel a value outcome before the next big delivery begins
- Value decisions are argued here by stakeholder value and sequenced by dependency in `delivery-management/`
- External integration is delivered only after internal value is trustworthy (auth + listings before Brevo/Flutterwave/Cloudinary are relied upon as value proof)
- **New (Wayfinder #1):** Marketplace freshness before thread — ghost prune + My Listings before in-app messaging; free WhatsApp handoff stays until live-tap rate proves thread is needed

## Deliberately not promised

- Physical shipping, logistics, or fulfillment — hand-off is on-campus
- Native iOS/Android apps — web SPA only (React + Vite)
- University SSO / government ID verification — verification is email OTP + matric number only
- Real-time video or social feed — out of marketplace scope
- Full in-app chat / WebSocket / notification fan-out beyond service/gig booking 1h escrow — parked this bet per Wayfinder #1; returns only if WhatsApp + ghost prune fails
- Marketplace ↔ Gig wallet conversion — isolated wallets, no conversion
