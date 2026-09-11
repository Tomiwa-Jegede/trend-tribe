# Wayfinder Map — Exclude Admin Activity From Analytics

## Destination
Every admin (`role===ADMIN`, incl. `Jegede01`) action — token purchases, button clicks/views, messages, listings, favorites, reports, contact views — is treated as testing: never logged, counted, or sent to backend analytics; only non-admin activity appears in `/api/stats`, `/admin/stats`, and all displayed stats.

## Notes
- Domain: TrendTribe analytics — `ListingView`, `ContactView`, `Message`, `Listing`, `TokenPurchase`/`GigTokenPurchase`, `Favorite`, `Report`, `SearchLog`, `stats` endpoints
- Skills every session should consult: `product-brainstorming` for framing, `ponytail` for minimal fix
- Stack: Prisma `User.role`, Express controllers (`listing.controller`, `message.controller`, `frederick`, `admin`), `realtime` emit, `stats` aggregation

## Decisions so far

## Not yet specified
- Which admin actions currently slip into counts and where the guard should live (controller vs middleware vs Prisma middleware)
- How to handle historical admin data already in counts — retroactive cleanup or forward-only
- Whether admin “views” should still increment `views` for display but not for analytics aggregation, or skip entirely
- Bot vs admin distinction for future test accounts

## Out of scope
- Hiding admin listings from marketplace (separate)
- Admin audit log for security (keep, but not in stats)
