# Milestone 3: Engagement & Safety

## Goal

Students can save favorites, report suspicious listings, and get AI help from Frederick, while admins moderate reports, listings, and users.

## Scope

- Favorites: `Favorite` model (`@@unique [listingId,userId]`, `@@index [userId]`), `POST /api/listings/:id/favorite`, `DELETE`, `GET /saved` (`FavoritesPage`), listing save button
- Reports: `Report` model (`ReportReason` `SCAM`/`FAKE_ITEM`/`INAPPROPRIATE_CONTENT`/`OTHER`, `ReportStatus` `PENDING`/`IGNORED`, `@@unique [listingId,reporterId]`), `POST /api/listings/:id/report`
- Admin: `GET/PATCH /api/admin/reports`, `/api/admin/listings`, `/api/admin/users`, pages `AdminDashboardPage`/`AdminListingsPage`/`AdminUsersPage`/`AdminReportsPage` gated by `ADMIN` role
- Frederick AI: `FrederickSession` (`@@unique [userId,sessionId]`), `POST /api/frederick/*`, `FrederickWidget`, `tokenBalance`/`aiUsesRemaining` gating

## Non-Goals

- Token purchases / Flutterwave webhook (Milestone 4)
- Marketplace CRUD itself (Milestone 2)
- Messaging, notifications, or `my-listings` (Milestone 5)

## Ownership Boundaries

- `backend/src/routes/listing.routes.js` (favorite/report) + `backend/src/routes/admin.routes.js` + `backend/src/routes/frederick.routes.js` — owns engagement/safety endpoints
- `backend/prisma/schema.prisma` (`Favorite`, `Report`, `FrederickSession`) — owns constraints and indexes
- `frontend/src/pages/FavoritesPage.jsx` + `frontend/src/pages/Admin*` + `frontend/src/components/frederick/FrederickWidget.jsx` — owns save/admin/AI UX

## Execution Order

1. Prisma `Favorite`/`Report`/`FrederickSession` -> migrate + generate
2. Backend favorite/report controllers with unique-constraint handling + admin controllers with `ADMIN` guard
3. Frederick session controller with token-balance check and `@@unique` session handling
4. Frontend `FavoritesPage`, admin pages (lazy), `FrederickWidget` + auth guards
5. Playwright `tests/admin.spec.js` + manual favorite/report flow

## Value Outcome

Delivers `product-management/value-map.md` outcomes V4, V5, V6 — Student (engaged): save/report; Administrator: moderate; Student (assisted): Frederick AI. Delivery status is not a claim of visible value; each is done only when the stakeholder can feel it.

## Status

Complete

- Current status summary: Delivered — favorites, reports, admin moderation, Frederick widget live; admin routes gated by role middleware
- Remaining work: evidence upload for reports, repeat-offender view, expanded e2e for report-status index

## Verification / Definition of Done

- `POST /api/listings/:id/favorite` twice returns 409/deduped, not duplicate row; `GET /saved` reflects saved state after auth
- `POST /api/listings/:id/report` with `ReportReason` succeeds; duplicate report by same user rejected by `@@unique`
- `GET /api/admin/reports` with `ADMIN` JWT returns `PENDING` list; same request with `USER` JWT returns 403; Playwright `admin.spec.js` passes
- Frederick session creation respects `aiUsesRemaining`/`tokenBalance` gating; `@@unique [userId,sessionId]` enforced

## Regression Guardrails

- Preserve `@@unique` constraints on `Favorite` and `Report`; do not allow duplicate saves/reports
- Keep `Report.status` index (`@@index([status])`) for admin query performance
- Never bypass `ADMIN` middleware on `/api/admin/*`; never allow Frederick calls to skip token checks
