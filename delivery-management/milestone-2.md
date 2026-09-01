# Milestone 2: Marketplace Core

## Goal

Students can create, publish, browse, filter, and inspect listings with images, categories, and condition metadata.

## Scope

- Listings CRUD: `POST /api/listings`, `GET /api/listings`, `GET /api/listings/:id`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id`
- Cloudinary image upload via `multer-storage-cloudinary` (`images` + `imagePublicIds` sync), `coverPosition`, `editCount`, `isAvailable`
- Prisma enums: `Category` (`ACCESSORIES`, `FASHION`, `BEAUTY_AND_PERSONAL_CARE`, `SNACKS`, `OTHERS`, `GADGETS`), `Subcategory`, `Condition` (`NEW`..`POOR`)
- Frontend: `CreateListingPage`, `EditListingPage`, `MarketplacePage` filters, `ListingDetailPage` gallery, `HomePage` category shortcuts
- Validation with `express-validator` on listing create/update; seller-only mutation guards

## Non-Goals

- Favorites, reports, or admin moderation (Milestone 3)
- Token purchases or Flutterwave webhook (Milestone 4)
- Messaging, notifications, or `my-listings` seller dashboard (Milestone 5)

## Ownership Boundaries

- `backend/src/routes/listing.routes.js` + `backend/src/controllers/listing.controller.js` — owns listing mutations and queries
- `backend/src/routes/upload.routes.js` — owns `Multer` Cloudinary upload
- `backend/prisma/schema.prisma` (`Listing` model) — owns `Category`/`Subcategory`/`Condition`, `images`/`imagePublicIds` shape
- `frontend/src/pages/CreateListingPage.jsx` / `EditListingPage.jsx` / `MarketplacePage.jsx` / `ListingDetailPage.jsx` — owns create/filter/detail UX

## Execution Order

1. Prisma `Listing` model + enums -> `npx prisma migrate dev` + `generate`
2. Backend upload + listing controllers with `express-validator` and ownership checks
3. Cloudinary config + `multer-storage-cloudinary` wiring
4. Frontend `CreateListingPage`/`EditListingPage` (lazy) + marketplace filters + detail gallery
5. Playwright `tests/create-listing.spec.js` + `tests/edit-listing.spec.js`

## Value Outcome

Delivers `product-management/value-map.md` outcomes V2 and V3 — Student Seller: create/manage listings; Student Buyer: browse/filter/inspect. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel each outcome.

## Status

Complete

- Current status summary: Delivered — listings CRUD + Cloudinary + category/condition filters live; Marketplace and ListingDetail render correctly
- Remaining work: expand `GADGETS` subcategory coverage and optimize images for mobile LCP

## Verification / Definition of Done

- `POST /api/listings` with authenticated JWT and multipart images creates `Listing` with synced `imagePublicIds`
- Marketplace filter by `Category`/`Condition`/price returns in under 1s for 100 listings
- Playwright `create-listing.spec.js` + `edit-listing.spec.js` pass; `GET /api/health` green
- Unauthorized edit/delete returns 403; `isAvailable` false listings excluded from public feed

## Regression Guardrails

- Keep `Listing.images` and `imagePublicIds` length in sync on create/edit/delete
- Never remove seller-ownership check on `PATCH`/`DELETE /api/listings/:id`
- Preserve `Category`/`Condition` enum values — frontend filter values must match `schema.prisma` exactly
