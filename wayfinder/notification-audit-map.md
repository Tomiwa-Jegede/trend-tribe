# Wayfinder Map — Notification System Audit (Planning/Research)

## Destination
Notification system is fully mapped end-to-end — every create → delivery (Pusher/Socket + Web Push) → bell UI / badges / mark-as-read → polling/realtime listeners branch is traced with actual data flow, loops, race conditions, duplicate sends, stale-state and cleanup gaps flagged as decision tickets with evidence, ready for user to prioritize before any fixes ship.

## Notes
- Domain: `notification.controller.js` `notification.routes.js` `realtime.js` `push.js` + `NotificationBell.jsx` `Navbar.jsx` `useRealtime` polling, `App.jsx` `PWARegister` badge sync
- Stack: Prisma `Notification {type, read, listingId, actorId, userId}` `Message` as precursor, Socket.IO + Pusher, Web Push `pushSubscription`, React hooks/effects
- Skills every session should consult: `ui-ux-pro-max` for bell/badge UX, `ponytail` for minimal tracing (no fix)
- Mode: Planning/research only — map + tickets flag suspicious flows with evidence, no deliverables until user prioritizes

## Decisions so far
<!-- one line per closed ticket, gist + link -->

## Not yet specified
- Exact `Notification` type taxonomy (which `type` triggers bell vs silent, and whether `type` drives `url` deep-link)
- Badge source of truth (`GET /notifications/unread-count` vs summed `Navbar` vs `setAppBadge` via push) consolidation
- Whether `mark-as-read` should be per-notification, per-page, or `read-all` only and what triggers `clearAppBadge`

## Out of scope
- Fix implementation for any flagged loop/race/duplicate (follow-up maps after audit prioritize)
- Message/chat inbox deletion loops (already covered by `message-push-offline` + `chat-four-fixes`)
- Admin treasury / gig wallet notification business rules beyond audit trace
