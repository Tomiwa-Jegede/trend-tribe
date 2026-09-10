# Ticket — Frontend Loopholes

## Question
Frontend has `isAuthenticated = !!token` showing authed when expired, `axios` 401 only clears on `/auth/me`, `toggleFavorite` double-click drift, `DiscoverFeed` share bump + realtime `+2`, `FilterBar` no debounce, and `ListingDetail` `revealContact` ignoring `needsTokenConfirm`. Which to fix now — `axios` clear-all 401, lock favorite, debounce search, handle token branch?

Label: wayfinder:task
Status: open
