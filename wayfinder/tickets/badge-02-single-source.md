---
label: wayfinder:grilling
---
## Question
How to keep all badges in sync without duplicate polls? Today `Navbar` fetches `messages/unread-count` + `notifications/unread-count` separately from `NotificationBell` internal fetch, causing drift. Should there be one `useUnreadCounts` hook/context with single fetch + realtime invalidation, or a batched `GET /unread-counts` endpoint?
