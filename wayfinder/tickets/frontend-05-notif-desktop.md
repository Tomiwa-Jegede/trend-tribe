# frontend-05-notif-desktop — CLOSED

## Question
Should desktop `More` dropdown `Navbar.jsx:430` also list `Notifications` like mobile Activity did, or keep bell-only as flagged? Grilling decision: consistency vs clutter, `lib/notifications.js` centralization.

## Type
wayfinder:grilling


## Resolution
Added Notifications row to desktop More dropdown `Navbar.jsx:447` with notifUnread badge, mirroring mobile Activity — bell stays persistent but More now consistent via `lib/notifications.js`. Saved locally.
