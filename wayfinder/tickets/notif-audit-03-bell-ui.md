---
label: wayfinder:research
status: open
---

## Question
Trace `frontend/src/components/notifications/NotificationBell.jsx` + `Navbar.jsx` bell/badge render, `useRealtime("notification")` listener, dropdown open/close and `getMyNotifications` fetch — does opening the bell fetch then immediately re-trigger a notification emit that re-fetches (loop), and does the bell show `listing.title` / `actor` deep-link (`/listings/:slug`, `/chat`, `/gigs`) correctly per `type`?
