---
label: wayfinder:research
status: open
---

## Question
Trace all polling + realtime tied to notifications: `NotificationBell.jsx` poll interval, `Navbar.jsx` 5s/30s `fetch` + `visibilitychange`/`focus`/`pageshow`, `PWARegister` 30s badge sync, `useRealtime("notification","message")` invalidate, and `vite.config.js` `runtimeCaching NetworkOnly` for `/api/notifications|messages|stats` — does a single `new Notification` fire both a `Pusher` event and a `poll` `GET` that re-emits, creating `event → refetch → event → refetch` loop, and are intervals throttled when `document.hidden`?
