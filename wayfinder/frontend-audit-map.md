# Wayfinder Map — Frontend Deep Audit (post hamburger + wallet fixes)

## Destination
Hand-off spec + fixes for remaining frontend risk: token storage (XSS/httpOnly), optimistic UI & realtime dedup loops, retry/polling loops, PWA/install loops, and notification centralization follow-through — decisions locked and ready to build.

## Notes
- Domain: Frontend React 19 + Vite 8 + axios `frontend/src/api/axios.js`, `AuthContext.jsx` token storage, `FavoritesContext.jsx` optimistic, `useRealtime.js` dedup, `GigWalletPage.jsx` history, `Navbar.jsx:93` hamburger cascade, `lib/notifications.js` centralization
- Skills every session should consult: `ui-ux-pro-max` for loops/optimistic UX, `ponytail` for minimal fix, `product-brainstorming` for tradeoffs
- Mode: Plan + fix in place allowed (small frontend patches)

## Decisions so far
- [hamburger-cascade](wayfinder/tickets/hamburger-cascade.md): Hamburger closed shows `inbox+notif` combined, Activity shows same + Notifications row, deep-link marks read — shipped `NotificationsPage-DLzXLbhc.js`.

## Not yet specified
- Token storage review — localStorage token + axios interceptor `axios.js:12` vs httpOnly cookie, XSS exposure, refresh handling
- Optimistic UI loops — `FavoritesContext.jsx` toggleFavorite optimistic revert, `ListingCard.jsx`, `MarketplacePage.jsx` realtime `favorite` dedup
- Retry/polling loops — `useRealtimePolling.js`, `GigWalletPage.jsx:73` fetchAll on focus/realtime, `Navbar.jsx:189` requestIdleCallback defer
- PWA/install loops — `usePWAInstall.js`, `PWAInstallButton`, `PWARegister.jsx`, `pwa.controller.js` find-loop maps
- Notification lib follow-through — `lib/notifications.js` centralization gap for desktop More dropdown
- Chat/Inbox loops — `ChatThread.jsx`, `InboxPage.jsx` already have `chat-two-scroll-zones` etc. maps, but stale fetch still?

## Out of scope
- Backend audit (done, `frederick.controller.js`, `gig.controller.js`, `TokenPurchase` FK)
- Design system overhaul beyond loops

