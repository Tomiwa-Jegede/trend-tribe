# Milestone 5: My Listings + Ghost Prune — Buyer Trust Slice

## Goal

A buyer who taps Contact Seller reaches a live seller because the marketplace stays fresh and a returning seller can prune their own ghosts in one place — without building chat.

## Scope

- Seller home: `GET /api/listings/me` (protected, seller-scoped, no public filter rebuild) + `frontend/src/pages/MyListingsPage.jsx` replacing `ComingSoonPage` at `/my-listings` — per `frontend/src/pages/MyListingsPage.prototype.jsx` (header: free-slot / `tokenBalance`  quarter-units, per-card: thumb `coverPosition`, title/price, `isAvailable` toggle via `PATCH /api/listings/:id`, GHOST badge when `isAvailable && age>30d && favorites=0`, `soldAt` age hint, actions Edit/Delete/Mark Sold)
- Lifecycle: `Listing.soldAt` + `archivedAt` timestamps added to `backend/prisma/schema.prisma:86` (keep `isAvailable bool` as marketplace filter at `backend/src/controllers/listing.controller.js:61`), daily job flips `isAvailable=false` where `isAvailable=true AND createdAt < now-30d` (beside `PendingRegistration` sweep at `backend/src/index.js:104`), seller can re-activate via My Listings toggle
- Coordination stays free WhatsApp leak at `backend/src/controllers/listing.controller.js:576` — no `Conversation`/`Message`, no gated reveal, no WebSocket
- Token stays 3 free then 1 token (4 units) after sell+delete at `backend/src/controllers/listing.controller.js:317` (`TOKEN_UNIT=4`), Frederick 1-2 units per fresh `sessionId` at `backend/src/controllers/frederick.controller.js:39`, single `tokenBalance` ledger (park `aiUsesRemaining` drift)

## Non-Goals

State what this milestone deliberately does not do.

- In-app `Conversation`/`Message` thread, WebSocket / polling, notification bell / Brevo fan-out — parked per Wayfinder #4
- Full FT search / `ViewEvent`/`SearchLog` instrumentation / recommendation — at 16 rows, only GADGETS chip exposure if demanded per Wayfinder #7
- `RESERVED` with TTL on inquiry — parked per Wayfinder #8 (no contention at this scale)
- Native mobile apps, physical shipping, escrow, university SSO

## Ownership Boundaries

- `backend/prisma/schema.prisma` (`Listing.soldAt`, `archivedAt`) + `backend/src/controllers/listing.controller.js` (30d job, `GET /me`) — owns lifecycle and seller scope
- `frontend/src/pages/MyListingsPage.jsx` — owns ghost-management UX (GHOST badge, `isAvailable` toggle), does not rebuild `MarketplacePage.jsx` filter
- `delivery-management/roadmap.md` + `product-management/value-chain-opportunities/MAP.md` — owns sequencing; `product-management/value-map.md` V2/V3 now PARTIAL until this slice ships

## Execution Order

Sequence by dependency.

1. Prisma `soldAt`/`archivedAt` on `Listing` → `npx prisma migrate dev` + `prisma generate`
2. Backend `GET /api/listings/me` (protect + `where:{sellerId:me}`) and `PATCH /:id` `isAvailable`/`soldAt` handling
3. Daily ghost job (30d) alongside `PendingRegistration` sweep — keep `express.raw` webhook at `backend/src/index.js:42` untouched
4. Frontend `MyListingsPage.jsx` from `MyListingsPage.prototype.jsx` (lazy via `ProtectedRoute`), GHOST badge logic (`favorites=0 && age>30d`)
5. Manual + Playwright: `GET /my-listings` renders ghost table, toggle flips `isAvailable`, job hides 30d listings from `/marketplace`, `GET /api/health` stays green

## Value Outcome

Closes `product-management/value-map.md` V2 (seller can manage) and V3 (buyer sees fresh) from PARTIAL to DELIVERED and supports Wayfinder buyer-trust proxy: **WhatsApp tap rate on live (non-ghost) listings** lifts because cold ghosts are pruned. Delivery status is not a claim of visible value; done only when a returning seller prunes and a new buyer hits fewer dead taps.

## Status

Delivered — verified 2026-09-04 (`GET /api/health` 200 `database: Connected`, ghost prune query runs on boot at `backend/src/index.js:128`, `GET /api/listings/me` behind `protect`, `/my-listings` ProtectedRoute live)

- Current status summary: 7 decisions closed — buyer trust first, free WA + ghost prune, keep token 3-free-then-1, My Listings prototype shipped as `MyListingsPage.jsx` (GHOST badge `fav=0 && age>30d`, `isAvailable` toggle via `PUT /api/listings/:id`, boost 24h), `Listing.soldAt/archivedAt` migrated `20260902_add_sold_archived_at`, 30d auto-hide `isAvailable=false` + `archivedAt`
- Remaining work: re-audit `value-map.md` V2/V3 to DELIVERED after 14d WhatsApp tap-rate lift on live listings; `/notifications` still parked

## Verification / Definition of Done

- `GET /api/listings/me` with JWT returns only caller's listings with `_count.favorites`; without JWT 401
- `GET /my-listings` (ProtectedRoute) shows GHOST badge for `isAvailable && age>30d && fav=0` and toggles `isAvailable` → reflected in `GET /api/listings` marketplace within 5s
- 30d job: listing created 31d ago with `isAvailable=true` is `isAvailable=false` after job run, surfaces in My Listings as archived, not in marketplace
- `GET /api/health` 200 `database: Connected`; existing Playwright `tests/create-listing.spec.js` + `edit-listing.spec.js` still pass; no new route behind unauthenticated access

## Regression Guardrails

- Keep `isAvailable` as marketplace filter (`where:{isAvailable:true}` at `listing.controller.js:61`) — bool stays source of truth, `soldAt` is signal not filter until Wayfinder revisits enum
- Do not weaken `protect` on `GET /me` or `PATCH /:id` — sellerId check (`findAndVerifyListing:15`) must stay 403 on foreign toggle
- Preserve `express.raw` placement for `POST /api/payments/webhook` before `express.json()` — ghost job added after, not before
- Keep `TOKEN_UNIT=4` single ledger; `GET /api/listings/me` fan-out must not double-charge `tokenBalance`
