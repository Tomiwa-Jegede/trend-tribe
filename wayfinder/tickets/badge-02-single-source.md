---
label: wayfinder:grilling
status: closed
---
## Question
How to keep all badges in sync without duplicate polls? Today `Navbar` fetches `messages/unread-count` + `notifications/unread-count` separately from `NotificationBell` internal fetch, causing drift. Should there be one `useUnreadCounts` hook/context with single fetch + realtime invalidation, or a batched `GET /unread-counts` endpoint?

## Resolution
Single `useUnreadCounts` hook in `Navbar.jsx` (`Promise.all` both counts) with single `useRealtime("message"/"notification")` invalidation; `NotificationBell` receives counts via props/context instead of separate fetch — no drift, no duplicate poll. No new batched endpoint — reuse existing counts (ponytail).
