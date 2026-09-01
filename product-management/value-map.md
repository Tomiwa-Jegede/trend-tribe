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
| V2 | Student Seller | Create, edit, and remove listings with photos and accurate metadata | Creates listing at `/create-listing` with images + `Category`/`Condition`/`Subcategory` -> sees it on `/marketplace` and `/listings/:id`; edits at `/listings/:id/edit` or deletes own listing | `POST /api/listings` with `Multer+Cloudinary` succeeds; detail shows gallery + `coverPosition`; Playwright create-listing + edit-listing specs pass | PARTIAL | Milestone 2 + Milestone 5 (My Listings slice) | `Listing.images` + `imagePublicIds` stay in sync; unauthorized edit/delete returns 403; `Price` stored as Decimal(10,2) |
| V3 | Student Buyer | Browse, filter, and inspect items quickly | Filters `/marketplace` by `Category`/`Condition`/price and opens `/listings/:id` to see gallery, price, condition, location, seller card | Filter returns in under 1s for 100 listings; detail page renders gallery + seller link in under 1.5s; category enums match `prisma/schema.prisma` | PARTIAL | Milestone 2 + Milestone 5 (ghost prune) | Marketplace pagination correct; sold/unavailable listings excluded by `isAvailable`; SEO + Helmet titles via `react-helmet-async` |
| V4 | Student (engaged) | Save items and report suspicious listings | Taps Save -> sees item in `/saved`; taps Report -> picks `ReportReason` -> sees confirmation toast | `POST /api/listings/:id/favorite` and `POST /api/listings/:id/report` succeed; `@@unique [listingId,userId]` enforced; `GET /saved` and `GET /api/listings/favorites` reflect state | DELIVERED | Milestone 3 | Duplicate favorite/report prevented by unique constraint; report `status` defaults to `PENDING` with index on `status` |
| V5 | Administrator | Moderate listings, reports, and users to keep the campus safe | Logs in as `ADMIN` -> sees `/admin` dashboard -> acts on `/admin/reports`, `/admin/listings`, `/admin/users` | `GET /api/admin/reports` lists `PENDING`; `PATCH /api/admin/reports/:id` updates to `IGNORED`; non-`ADMIN` JWT gets 403; Playwright admin spec passes | DELIVERED | Milestone 3 | Every `/api/admin/*` gated by `ADMIN` role middleware; cascade deletes on report/listing respect FK constraints |
| V6 | Student (assisted) | Get contextual AI help for discovery and styling without breaking the trust loop | Opens `FrederickWidget` -> asks style/price question -> receives answer within token budget -> sees `aiUsesRemaining` decrement | `POST /api/frederick/session` creates `FrederickSession` (`@@unique [userId,sessionId]`); widget renders in under 500ms; gated by `tokenBalance`/`aiUsesRemaining` | DELIVERED | Milestone 3 | No Frederick call bypasses token check; session cost deducted atomically; no PII leaks to LLM provider |
| V7 | Student (paying) | Top up tokens securely via local payment to unlock higher-value actions | Initiates token purchase -> Flutterwave checkout -> returns to `/tokens/callback` with success and `tokenBalance` increased | `POST /api/payments/initiate` creates `TokenPurchase` `PENDING` with unique `reference`; verified `POST /api/payments/webhook` (`express.raw`) flips to `SUCCESS` and increments `tokenBalance`; `TokenCallbackPage` confirms | DELIVERED | Milestone 4 | Token increment only inside hash-verified webhook (`FLUTTERWAVE_SECRET_HASH`); `reference` unique; `amount` in kobo; never increment on client callback alone |
| V8 | Campus visitor / prospective student | Understand and trust the platform before joining | Visits `/` -> sees categories, features, and CTA; navigates to `/about`, `/faq`, `/privacy`, `/terms`, `/features` | GA4 `gtag page_view` fires on SPA navigation via `usePageviewTracking`; Home renders in under 2s; canonical + OG tags via `Helmet` | DELIVERED | Milestone 4 | Netlify frontend deploys keep routes working; 404 handled by `NotFoundPage`; static pages not behind auth |

> **Re-audit note (Wayfinder #1, 2026-09-01):** V2 moved DELIVERED → PARTIAL — 5% repeat sellers (2/39) and missing `/my-listings` (still `ComingSoonPage`) means sellers list once but don't return; closes with `Milestone 5` My Listings slice `GET /api/listings/me` + GHOST badge. V3 moved DELIVERED → PARTIAL — 10/16 (62.5%) listings have 0 favorites and all 16 are <14d old (0 ghost yet) — marketplace is fresh but cold, and `isAvailable` pollution will recur without 30d auto-hide; closes with `Milestone 5` ghost prune (`soldAt`/`archivedAt` + `isAvailable=false` at 30d). Both now measured by **WhatsApp tap rate on live listings**, not just filter speed.

## Cross-cutting value gaps

1. **Buyer trust handoff is PARTIAL** — `/listings/:id` still leaks free `whatsapp` to WhatsApp at `backend/src/controllers/listing.controller.js:576` with no trail. Wayfinder #4 decided to keep free leak + ghost prune this bet and park `Conversation`/`Message` thread — true inquiry-to-reply rate deferred, proxy is tap on live. Closes only if ghost prune lifts reply rate; otherwise re-opens as thread-lite.
2. **My Listings is PARTIAL, not GAP** — prototype at `frontend/src/pages/MyListingsPage.prototype.jsx` (GHOST badge, `isAvailable` toggle, `GET /api/listings/me`) is hand-off ready, but not shipped. Notifications remain GAP — `/notifications` still `ComingSoonPage`; parked per Wayfinder #1 Out of scope.

## Sequencing principle

- Every delivery milestone must make a named stakeholder feel a value outcome before the next big delivery begins
- Value decisions are argued here by stakeholder value and sequenced by dependency in `delivery-management/`
- External integration is delivered only after internal value is trustworthy (auth + listings before Brevo/Flutterwave/Cloudinary are relied upon as value proof)
- **New (Wayfinder #1):** Marketplace freshness before thread — ghost prune + My Listings before in-app messaging; free WhatsApp handoff stays until live-tap rate proves thread is needed

## Deliberately not promised

- Physical shipping, logistics, or fulfillment — hand-off is on-campus
- Native iOS/Android apps — web SPA only (React + Vite)
- Escrow or buyer-protection payments — token purchase is the only paid flow
- University SSO / government ID verification — verification is email OTP + matric number only
- Real-time video or social feed — out of marketplace scope
- Full in-app chat / WebSocket / notification fan-out — parked this bet per Wayfinder #1; returns only if WhatsApp + ghost prune fails
