---
label: wayfinder:research
status: open
---

## Question
Check stale-state class bugs like `InboxPage` message deletion (tombstone `pendingDeletesRef` 10s to avoid poll resurrect) — does `NotificationBell` / `getMyNotifications` have same poll-timing bug where a just-deleted or just-read notification reappears on next 5s/30s poll due to replica lag, `recipientDeleted`/`read` write not yet visible, or `navigateFallback` serving stale `index.html`?
