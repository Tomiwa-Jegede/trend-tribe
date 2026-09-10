# Wayfinder Map — PWA Find Loop Sync

## Destination
PWA Discover `Find` loop is byte-for-byte in sync with browser: same fetch, same shuffle, same triplicate wraparound, same realtime counts, same resume — no PWA-only stale loop.

## Notes
- Domain: PWA (VitePWA/Workbox) + DiscoverFeed triplicate infinite scroll
- Skills: `ui-ux-pro-max` for scroll/snap, `ponytail` for minimal fix, `product-brainstorming` for framing
- Stack: `DiscoverFeed.jsx` loopItems x3, `vite.config.js` runtimeCaching, `listingService.getListings(sort=random)`, `sessionStorage DISCOVER_SCROLL_KEY`, realtime `favorite/share/contact`

## Decisions so far
- [PWA Cache Strategy](tickets/pwa-01-cache-strategy.md): Keep `NetworkOnly` for `/api/listings|auth/me|notifications|messages` first-match, `cleanupOutdatedCaches:true` invalidates old SW — verified `vite.config.js:77` already covers `?sort=random` query.
- [Shuffle Source](tickets/pwa-02-shuffle-source.md): Remove client `shuffleArray`; server `sort=random` is single source of truth — `DiscoverFeed.jsx:167` now `setListings(data.listings)` with no double-shuffle.
- [Loop Geometry](tickets/pwa-03-loop-geometry.md): Measure via `getBoundingClientRect().height` + `ResizeObserver` (`DiscoverFeed.jsx:205`) so PWA `window-controls-overlay` and browser `clientHeight` converge; wraparound jump reuses `itemHeightRef`.
- [Resume Store](tickets/pwa-04-resume-store.md): Switch `DISCOVER_SCROLL_KEY` from `sessionStorage` to `localStorage` + `getStoredIndex()` (`DiscoverFeed.jsx:124,212,260`) so standalone PWA and browser tabs share resume index; broadcast via storage write.
- [Membership Realtime](tickets/pwa-05-membership-realtime.md): Subscribe to `listing` `create/delete/hide/update` (`DiscoverFeed.jsx:171`) via `useRealtime("listing")` on `marketplace` channel — PWA no longer stale until reload.

## Not yet specified

## Out of scope
- TikTok-style autoplay video (not in V1)
- Offline full Discover fallback (future: cached loop when offline)
