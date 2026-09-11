---
label: wayfinder:grilling
---
## Question
“Contact Us” button on Help page (`Require login`, `3/day`, `Create new ticket` per click) opens per-user `listingId=null` thread; admin `New Support page` `/admin/support` shows queue, `Confirm` locks to claimer (`First wins`, others see `Claimed by X` view-only) and auto-sends `Hi, my name is [Admin username].` — should this be `Message` with `listingId=null` + `Conversation` per user or new `SupportTicket` model, with `30d` TTL?
