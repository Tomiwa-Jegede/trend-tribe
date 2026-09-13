---
label: wayfinder:research
status: open
---

## Question
Trace every unread/badge source: `GET /notifications/unread-count`, `GET /messages/unread-count`, `Navbar.jsx` summed hamburger `total = inboxUnread + notifUnread`, `PWARegister.jsx` `setAppBadge`/`clearAppBadge` 30s poll + `visibilitychange`/`focus`/`push` sync, and `NotificationBell` own poll — do multiple sources write the same `total` concurrently (race), double-count same `MESSAGE` as both `notifications` + `messages` unread, or miss `role != ADMIN` filter?
