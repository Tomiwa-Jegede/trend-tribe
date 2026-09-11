---
label: wayfinder:grilling
status: closed
---
## Question
Which client storage should hold last known live stats for instant placeholder — `localStorage` (persists across sessions/tabs/PWA), `sessionStorage` (per tab), IndexedDB, or Workbox cache — and what key/JSON shape, expiry, and size limits keep it safe without leaking private data?

## Resolution
`localStorage` `trend-tribe:stats-cache` JSON `{ hero: {activeListings,totalUsers,whatsappMembers}, updatedAt: ISO, version:1 }` (<5KB, public counts only, no PII). Persists across browser/PWA same origin, survives reload. Expiry 24h handled in `stats-04`. `sessionStorage` too ephemeral, IndexedDB overkill, Workbox cache would duplicate and hide real fetch.
