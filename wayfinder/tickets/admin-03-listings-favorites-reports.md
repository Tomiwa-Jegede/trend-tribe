---
label: wayfinder:grilling
status: closed
---
## Question
Should `POST /listings` (and `PUT`/`boost`), `POST /favorites`, `POST /reports`, `POST /gigs` created by admin be excluded from `activeListings`/`totalListings`/`topFavorited`/`coldListings` stats and from `SearchLog`, and should they still appear in marketplace for testing visibility?

## Resolution
Admin listings/favorites/reports/gigs remain visible in marketplace for testing, but `activeListings`/`totalListings`/`topFavorited`/`coldListings` aggregations filter `where: { seller: { role: { not: "ADMIN" } } }`; skip `SearchLog.create` when admin.
