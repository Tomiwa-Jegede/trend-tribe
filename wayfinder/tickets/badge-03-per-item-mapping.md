---
label: wayfinder:grilling
status: closed
---
## Question
Which hamburger rows get a badge and what count do they show? E.g., `Messages` = chat unread, `Inbox` = system messages, `Favorites` = no badge, `Bookings` = pending count? Need explicit mapping table to avoid showing badge on wrong row.

## Resolution
`Chats (/chat)` → `inboxUnread` (chat), `Inbox (/inbox)` → no badge, `Favorites` → no badge, `Bookings`/`Gigs`/`Admin` → no badge in hamburger total (pending bookings are not unread). Table prevents wrong-row badge.
