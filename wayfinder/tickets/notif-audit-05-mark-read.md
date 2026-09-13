---
label: wayfinder:research
status: open
---

## Question
Trace `PATCH /notifications/:id/read` (`markRead`), `POST /notifications/read-all` (`markAllRead`), and `NotificationBell` click-to-mark + `PWARegister` `markAllSeen` on open (visibilitychange) — does marking read itself create a new `Notification` or emit that triggers another `fetch`/`poll` loop, and does `read-all` correctly clear both `notifications` + `messages` badges and `setAppBadge`?
