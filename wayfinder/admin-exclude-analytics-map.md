# Wayfinder Map — Exclude Admin Activity From Analytics

## Destination
Every admin (`role===ADMIN`, incl. `Jegede01`) action — token purchases, button clicks/views, messages, listings, favorites, reports, contact views — is treated as testing: never logged, counted, or sent to backend analytics; only non-admin activity appears in `/api/stats`, `/admin/stats`, and all displayed stats.

## Notes
- Domain: TrendTribe analytics — `ListingView`, `ContactView`, `Message`, `Listing`, `TokenPurchase`/`GigTokenPurchase`, `Favorite`, `Report`, `SearchLog`, `stats` endpoints
- Skills every session should consult: `product-brainstorming` for framing, `ponytail` for minimal fix
- Stack: Prisma `User.role`, Express controllers (`listing.controller`, `message.controller`, `frederick`, `admin`), `realtime` emit, `stats` aggregation

## Decisions so far
- [admin-01-views-contactviews](tickets/admin-01-views-contactviews.md): Skip entirely for admin — no ListingView/views/contactViews.
- [admin-02-messages](tickets/admin-02-messages.md): Skip ContactView/Notification for admin sender; Message still created but excluded from stats via sender.role filter.
- [admin-03-listings-favorites-reports](tickets/admin-03-listings-favorites-reports.md): Admin listings visible but excluded from activeListings stats via seller.role filter; skip SearchLog.
- [admin-04-token-purchases](tickets/admin-04-token-purchases.md): Keep token decrement for testing, exclude from PlatformProfit/tokenSold aggregations (already non-admin filter).
- [admin-05-stats-endpoints](tickets/admin-05-stats-endpoints.md): Filter /api/stats and /admin/stats every count by role != ADMIN; no raw toggle.
- [admin-06-button-clicks-searchlog](tickets/admin-06-button-clicks-searchlog.md): Guard SearchLog/PWAInstall counting for admin.

## Not yet specified
<!-- all tickets closed — way clear, ready to build -->

## Out of scope
- Hiding admin listings from marketplace (separate)
- Admin audit log for security (keep, but not in stats)
