# Wayfinder Map — Live Stats Cached Placeholder

## Destination
Live stats (active listings, total users/students, WhatsApp group, community) never show blank/loading on first load — last known figures from cache appear instantly as placeholder, then silently update to fresh backend numbers once fetched, with no stale-data bugs or flicker.

## Notes
- Domain: TrendTribe live stats — `HomePage.jsx` hero stats (`/api/stats`, `/api/admin/stats`, `/pwa/stats`), `Navbar` maybe
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for loading/placeholder UX, `ponytail` for minimal fix
- Stack: React 19 + `api.get("/stats")` 30s poll + `useRealtime` + `localStorage`/`sessionStorage`, VitePWA Workbox

## Decisions so far
- [stats-01-storage-choice](tickets/stats-01-storage-choice.md): `localStorage` `trend-tribe:stats-cache` `{hero, updatedAt}` (<5KB, public only).
- [stats-02-stats-scope](tickets/stats-02-stats-scope.md): Cache hero `GET /api/stats` (`activeListings/totalUsers/whatsappMembers`) single key.
- [stats-03-placeholder-ux](tickets/stats-03-placeholder-ux.md): Cached at 0.85 opacity + pulse; no cache → `—`; fade to fresh, no flicker.
- [stats-04-update-invalidation](tickets/stats-04-update-invalidation.md): Write only on 200 + realtime; `>24h` ignore; error keeps stale; stale-while-revalidate.
- [stats-05-pwa-share](tickets/stats-05-pwa-share.md): `localStorage` shared browser/PWA; `NetworkOnly` for `/api/stats`, no Workbox stale.

## Not yet specified
<!-- all tickets closed — way clear, ready to build -->

## Out of scope
- Push badge counts (separate)
- Email stats
