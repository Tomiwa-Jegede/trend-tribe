# Wayfinder Map — Frontend Deep Audit (post hamburger + wallet fixes)

## Destination
Hand-off spec + fixes for remaining frontend risk: token storage (XSS/httpOnly), optimistic UI & realtime dedup loops, retry/polling loops, PWA/install loops, and notification centralization follow-through — decisions locked and ready to build.

## Notes
- Domain: Frontend React 19 + Vite 8 + axios `frontend/src/api/axios.js`, `AuthContext.jsx` token storage, `FavoritesContext.jsx` optimistic, `useRealtime.js` dedup, `GigWalletPage.jsx` history, `Navbar.jsx:93` hamburger cascade, `lib/notifications.js` centralization
- Skills every session should consult: `ui-ux-pro-max` for loops/optimistic UX, `ponytail` for minimal fix, `product-brainstorming` for tradeoffs
- Mode: Plan + fix in place allowed (small frontend patches)

## Decisions so far
- [frontend-05-notif-desktop](tickets/frontend-05-notif-desktop.md): Notifications added to desktop More with badge
- [frontend-02-optimistic-loops](tickets/frontend-02-optimistic-loops.md): pendingRef + lastEvRef dedup clean
- [frontend-01-token-storage](tickets/frontend-01-token-storage.md): localStorage + x-new-token 7d, keep vs httpOnly decision pending
- [frontend-03-retry-polling](tickets/frontend-03-retry-polling.md): realtime dedup 300ms, polling 10s, axios no retry loop
- [frontend-04-pwa-loops](tickets/frontend-04-pwa-loops.md): PWA loops bounded, 10m dedup admin-excluded
- [hamburger-cascade](wayfinder/tickets/hamburger-cascade.md): Hamburger closed shows `inbox+notif` combined, Activity shows same + Notifications row, deep-link marks read — shipped `NotificationsPage-DLzXLbhc.js`.

## Not yet specified
- (graduated) Token storage review → [frontend-01-token-storage](tickets/frontend-01-token-storage.md)
- (graduated) Retry/polling loops → [frontend-03-retry-polling](tickets/frontend-03-retry-polling.md)
- (graduated) PWA/install loops → [frontend-04-pwa-loops](tickets/frontend-04-pwa-loops.md)
- (graduated) Optimistic UI loops → [frontend-02-optimistic-loops](tickets/frontend-02-optimistic-loops.md)
- (graduated) Notification desktop → [frontend-05-notif-desktop](tickets/frontend-05-notif-desktop.md)
- Chat/Inbox loops — `ChatThread.jsx`, `InboxPage.jsx` already have `chat-two-scroll-zones` etc. maps, but stale fetch still?

## Out of scope
- Backend audit (done, `frederick.controller.js`, `gig.controller.js`, `TokenPurchase` FK)
- Design system overhaul beyond loops

