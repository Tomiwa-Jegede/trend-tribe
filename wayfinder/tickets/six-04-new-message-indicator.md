---
label: wayfinder:grilling
status: closed
---
## Question
No indicator for new chat message — should `InboxPage`/`Chat` list show `unreadCount` pill (`Message where listingId not null`) that navigates directly to that `thread` on tap, and should `Navbar` hamburger + `ChatThread` ticks keep in sync without polling race?

## Resolution
Yes: `InboxPage` conversation row `unreadCount` red pill `>0` + `Inbox`/`Chat` badge, tap `Open chat →` navigates to `?thread=listingId-otherId` (already `InboxPage.jsx:274`); `Navbar` hamburger badge `inboxUnread+notifUnread` (shipped `0024a8d`) syncs via `useRealtime("message")` + 5s poll with tombstones, no race; `ChatThread` ticks stay `✓/✓✓`.
