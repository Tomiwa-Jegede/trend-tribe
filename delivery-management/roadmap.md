# Product Roadmap

## Purpose

Sequences how Trend Tribe delivers student marketplace value — from auth trust to listings to moderation and monetization — tracked by dependency, not by stakeholder wish list.

## Product North Star

Any verified student can list an item in under 60 seconds, any other student can find it by category/price/condition in seconds, and both feel safe trading on campus — with admin oversight and zero fees.

## Product Surfaces

### Current Core Surfaces

- `frontend/` SPA (`/` , `/marketplace`, `/listings/:id`, `/login`, `/register`, `/verify-registration`, `/profile/:id`, `/create-listing`, `/listings/:id/edit`, `/saved`, `/admin/*`) — public discovery, auth, listing create/edit, favorites, admin moderation, AI widget
- `backend/` API (`/api/auth`, `/api/listings`, `/api/upload`, `/api/admin`, `/api/frederick`, `/api/payments`) — auth/JWT/OTP, listings CRUD, Cloudinary uploads, favorites/reports, Frederick sessions, token purchases + Flutterwave webhook

### Planning Focus Areas

- Wayfinder buyer-trust slice: `My Listings` ghost management + 30d auto-hide (`Milestone 5`) — `/messages`/`/notifications` parked, no `Conversation`/`Message` this bet
- Search relevance: `GADGETS`/`PHONE_ACCESSORIES` chip exposure only (FT index + `ViewEvent` parked per Wayfinder #7 at 16 rows)
- Performance, image optimization, and Playwright e2e coverage expansion

## Architecture Boundary

- `backend/` — owns data, validation, auth, storage, and business rules; Prisma is the only DB access layer; `express-validator` gates every controller; `express.raw` only for `/api/payments/webhook`
- `frontend/` — owns presentation, routing, auth state, and user flows; no direct DB access; calls backend via `axios` at `config.clientUrl` with JWT bearer
- `delivery-management/` — owns sequencing by dependency; `product-management/` owns value thesis

Product semantics should stay in the correct layer.

## Milestone Map

Each subsection maps 1:1 to a numbered tracker file (`milestone-N.md`). The tracker is the source of truth for scope, execution order, and verification; this file shows sequencing and status roll-up.

### Milestone 1: Auth & Trust Foundation

- Goal: Verified students can register, verify via OTP, log in, reset password, and manage their profile with JWT-secured access.
- Includes: register/OTP/verify, login, JWT + bcryptjs, forgot/reset password (Brevo OTP), profile edit (avatar/whatsapp/bio), role `USER`/`ADMIN`/`BUYER`/`SELLER`, `PendingRegistration` cleanup, validation via `express-validator`
- Status summary: Complete — e2e login + smoke passing, health check at `GET /api/health` green
- Tracker: see [`milestone-1.md`](./milestone-1.md)

### Milestone 2: Marketplace Core

- Goal: Students can create, edit, browse, and view listings with images, category/condition filters, and location.
- Includes: listings CRUD, `multer-storage-cloudinary` uploads, `Category`/`Condition`/`Subcategory` enums, cover position/edit count, marketplace filters, `ListingDetailPage`, image public-ID sync
- Status summary: Complete (core delivered; edge cases like `GADGETS` subcategories still expanding)
- Tracker: see [`milestone-2.md`](./milestone-2.md)

### Milestone 3: Engagement & Safety

- Goal: Students can save favorites, report listings, and get help from Frederick AI; admins can moderate users, listings, and reports.
- Includes: `Favorite`/`Report` models, `/saved` page, report reasons/status, `AdminDashboardPage`/`AdminUsersPage`/`AdminListingsPage`/`AdminReportsPage`, `FrederickSession`, `FrederickWidget`
- Status summary: Complete — admin routes gated by `ADMIN` role, favorites/reports e2e partly covered
- Tracker: see [`milestone-3.md`](./milestone-3.md)

### Milestone 4: Monetization & Discovery

- Goal: Students can purchase tokens via Flutterwave and landing/discovery feels polished and measurable.
- Includes: `TokenPurchase` flow (`/api/payments` + webhook `express.raw` + `TokenCallbackPage`), `tokenBalance`/`aiUsesRemaining` gating, `HomePage` categories/features/CTA, `FeaturesPage`/`AboutPage`/`FAQPage`, `Helmet` SEO + GA4 `usePageviewTracking`
- Status summary: Delivered — webhook hash verified, `POST /api/payments/webhook` before `express.json()`, Netlify hosting configured
- Tracker: see [`milestone-4.md`](./milestone-4.md)

### Milestone 5: My Listings + Ghost Prune — Buyer Trust Slice (Wayfinder Map #1 hand-off)

- Goal: A buyer who taps Contact Seller reaches a live seller because the marketplace stays fresh and a returning seller can prune their own ghosts in one place — without building chat.
- Includes: `GET /api/listings/me` + `MyListingsPage.jsx` from `MyListingsPage.prototype.jsx` (GHOST badge, `isAvailable` toggle), `Listing.soldAt`/`archivedAt` + 30d auto-hide job, free WhatsApp handoff stays, token keeps 3 free then 1 token (Frederick 1-2 units, single ledger)
- Status summary: Delivered — `GET /api/listings/me` + `PATCH /:id` `isAvailable/soldAt` + 30d job (`backend/src/index.js:128`) + `MyListingsPage.jsx` GHOST badge/toggle/boost live at `/my-listings` (ProtectedRoute); `/messages`→`/inbox` shipped, `/notifications` still `ComingSoonPage`
- Tracker: see [`milestone-5.md`](./milestone-5.md)

## Sequencing Rules

- Foundation before marketplace: M1 auth/JWT must land before any protected listing mutation
- Data model before surfaces: Prisma enums/migrations (`Category`, `Condition`, `ReportReason`) ship before the frontend form that exposes them
- Internal value before external integration: Flutterwave/brevo verified only after core auth + listings are trustworthy
- Admin gating before scale: report/favorite and admin moderation must be proven before opening messaging/notifications
- Marketplace freshness before thread: ghost prune + My Listings before in-app `Conversation`/`Message` — free WhatsApp handoff stays until tap-on-live rate lifts (Wayfinder #1)

## Regression Guardrails

- No milestone ships without `GET /api/health` green and existing Playwright specs (smoke, login, create-listing, edit-listing, admin) still passing
- Never move token increment outside the verified webhook handler; `TokenPurchase` status stays `PENDING` until hash verification passes
- Keep `Listing.images` and `imagePublicIds` in sync on every create/edit/delete; Cloudinary deletions must match DB state
- Preserve `express.raw` placement for `/api/payments/webhook` ahead of `express.json()` — reordering breaks Flutterwave verification
