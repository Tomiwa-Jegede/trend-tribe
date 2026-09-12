---
label: wayfinder:research
status: closed
---

## Question
When admin is logged in and creates a listing (`POST /api/listings`), favorites, or views (`GET /listings/:id` `views`/`ListingView`/`contactViews`), does that listing appear in public `GET /api/listings` / `MarketplacePage` / `DiscoverFeed` and pollute marketplace? `admin.routes.js:44-68` and `stats.routes.js:13` filter `seller.role != ADMIN` for stats, but `admin.routes.js:105-147` `GET /admin/listings` shows all and `GET /api/listings` (listing controller) is unfiltered. Should public marketplace explicitly `where seller.role != ADMIN` or `isAdmin` flag hide admin test data, and should `GET /listings/:id` skip `views`/`contactViews` increment when `req.user.role===ADMIN` (as decided in `admin-01-views-contactviews.md`)?

## Resolution
Research done: `listing.controller.js:218` `GET /api/listings` base `where {isAvailable:true}` leaks admin listings to `MarketplacePage`+`DiscoverFeed` (both `seller.role` unfiltered); `admin.routes.js:105` intentionally shows all for admin view. `GET /listings/:id` views already skipped for `role===ADMIN` per `admin-01`, but `revealContact`/`trackContactOpen` and `toggleFavorite` still increment for admin — leak. Fix: public `getAllListings` + `searchByImage` add `seller:{role:{not:"ADMIN"}}`, `revealContact`/`trackContactOpen` add `&& req.user?.role!=="ADMIN"` guard (no `contactViews`/`ContactView`), stats already filtered. Ponytail: one `where` addition fixes marketplace + discover + image search.
