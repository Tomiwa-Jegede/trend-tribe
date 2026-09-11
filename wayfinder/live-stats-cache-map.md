# Wayfinder Map — Live Stats Cached Placeholder

## Destination
Live stats (active listings, total users/students, WhatsApp group, community) never show blank/loading on first load — last known figures from cache appear instantly as placeholder, then silently update to fresh backend numbers once fetched, with no stale-data bugs or flicker.

## Notes
- Domain: TrendTribe live stats — `HomePage.jsx` hero stats (`/api/stats`, `/api/admin/stats`, `/pwa/stats`), `Navbar` maybe
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for loading/placeholder UX, `ponytail` for minimal fix
- Stack: React 19 + `api.get("/stats")` 30s poll + `useRealtime` + `localStorage`/`sessionStorage`, VitePWA Workbox

## Decisions so far

## Not yet specified
- Which storage holds last known figures and how long is a cached value still safe to show?
- What exactly counts as “live stats” — which fields from which endpoints, and should they share one cache key or separate?
- How to show stale placeholder vs fresh without flicker or misleading users when cache is very old or first visit has no cache?
- When and how does cache get updated and invalidated (on success, on error, on realtime event)?
- How to handle PWA standalone vs browser tab cache sharing and first-load blank when SW not yet installed?

## Out of scope
- Push badge counts (separate)
- Email stats
