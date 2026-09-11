---
label: wayfinder:grilling
status: closed
---
## Question
What sums into the hamburger total badge? Is it `messages unread (chat) + notifications unread`, or also `gigs available`, `bookings pending`, `support`? Should admin see different total than user?

## Resolution
Total = chat `unreadCount (listingId not null)` + `notifications unread`. Implemented `Navbar.jsx:75` `inboxUnread + notifUnread` (already `0024a8d`). Gigs/bookings excluded. Admin same — support notifications already counted via `emitNotification`.
