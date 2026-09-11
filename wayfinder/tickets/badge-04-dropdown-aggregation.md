---
label: wayfinder:grilling
status: closed
---
## Question
For dropdowns like `Services` (contains `Messages`, `Inbox`, `My Bookings`, `As Provider`), should the parent `Services` badge be the sum of its children, the max, or just a dot? And should children badges be shown only when dropdown is open or also as collapsed hint?

## Resolution
Parent `Services` badge = sum of children badges (currently `inboxUnread` only); children badges shown only when dropdown open; collapsed parent shows sum as count (or dot if >0) — no double-count.
