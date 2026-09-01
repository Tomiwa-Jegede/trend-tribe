# Milestone 4: Monetization & Discovery

## Goal

Students can purchase tokens via Flutterwave with webhook-verified balance updates, and visitors experience polished discovery with SEO and analytics.

## Scope

- Token purchases: `TokenPurchase` model (`reference` unique, `flutterwaveTransactionId` unique, `quantity`, `amount` in kobo, `status` `PENDING`/`SUCCESS`/`FAILED`), `POST /api/payments/initiate`, `GET /api/payments/verify`, `POST /api/payments/webhook` with `express.raw` + `FLUTTERWAVE_SECRET_HASH`
- Frontend callback: `TokenCallbackPage` (`/tokens/callback` protected), `tokenBalance`/`aiUsesRemaining`/`numberViewsRemaining` display, axios interceptor for JWT
- Discovery polish: `HomePage` hero + categories + features + CTA, `FeaturesPage`, `AboutPage`, `FAQPage`, `PrivacyPage`, `TermsPage`, `ComingSoonPage`
- SEO + analytics: `react-helmet-async` canonical/OG tags, GA4 `usePageviewTracking` on SPA navigation, `PageTransition` polish

## Non-Goals

- In-app messaging or notifications (Milestone 5)
- Admin moderation internals (Milestone 3)
- New marketplace CRUD (Milestone 2)

## Ownership Boundaries

- `backend/src/routes/payment.routes.js` + `backend/src/controllers/payment.controller.js` (including `handleWebhook`) — owns initiate/verify/webhook and `TokenPurchase` status transitions
- `backend/src/index.js` — owns `POST /api/payments/webhook` `express.raw` placement before `express.json()`
- `backend/prisma/schema.prisma` (`TokenPurchase`) — owns payment data shape
- `frontend/src/pages/TokenCallbackPage.jsx` + `frontend/src/pages/HomePage.jsx` — owns purchase callback + discovery UX

## Execution Order

1. Prisma `TokenPurchase` model -> migrate + generate
2. Backend payment controller: initiate (create `PENDING` with `tx_ref`), webhook (`express.raw`, hash verify, set `SUCCESS` + increment `user.tokenBalance`), verify endpoint
3. Frontend `TokenCallbackPage` + `FrederickWidget` gating wired to `tokenBalance`
4. Homepage and static pages polish (`HomePage` framer-motion, `Helmet` SEO)
5. GA4 `usePageviewTracking` + Netlify `netlify.toml` + manual webhook hash test + `GET /api/health` green

## Value Outcome

Delivers `product-management/value-map.md` outcomes V7 and V8 — Student (paying): webhook-verified token top-up; Campus visitor: trusted discovery with SEO/analytics. Delivery status is not a claim of visible value; done only when each stakeholder can feel it.

## Status

Complete

- Current status summary: Delivered — Flutterwave flow ends with verified `SUCCESS` and `tokenBalance` increment; homepage, static pages, and GA4 tracking live; Netlify hosting configured
- Remaining work: token pack promotions UX, clearer `amount`/`quantity` labeling in callback

## Verification / Definition of Done

- `POST /api/payments/initiate` with JWT creates `TokenPurchase` `PENDING` with unique `reference`; duplicate `reference` rejected
- Simulated `POST /api/payments/webhook` with valid `FLUTTERWAVE_SECRET_HASH` flips `status` to `SUCCESS` and increments `user.tokenBalance`; invalid hash returns 401 and does not increment
- Manual: initiate -> Flutterwave checkout -> redirect to `/tokens/callback` -> success message + updated balance visible
- GA4 `page_view` fires on `/` -> `/marketplace` SPA navigation; `Helmet` canonical + OG tags render on Home

## Regression Guardrails

- Keep `POST /api/payments/webhook` mounted before `express.json()` — moving it breaks hash verification
- Never increment `tokenBalance` outside the verified webhook handler; client-side callback alone must not mint tokens
- Preserve `reference` and `flutterwaveTransactionId` uniqueness constraints
- Keep `TokenCallbackPage` behind `ProtectedRoute`; anonymous access to callback is redirected to `/login`
