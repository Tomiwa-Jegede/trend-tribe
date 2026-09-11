---
label: wayfinder:grilling
status: closed
---
## Question
“Contact Us” button on Help page (`Require login`, `3/day`, `Create new ticket` per click) opens per-user `listingId=null` thread; admin `New Support page` `/admin/support` shows queue, `Confirm` locks to claimer (`First wins`, others see `Claimed by X` view-only) and auto-sends `Hi, my name is [Admin username].` — should this be `Message` with `listingId=null` + `Conversation` per user or new `SupportTicket` model, with `30d` TTL?

## Resolution
Reuse `Message`/`Conversation` with `listingId=null` (ponytail, no new model): `POST /messages` with `listingId=null` creates per-user `Conversation` (`buyerId=user, sellerId=adminPool` or `listingId=null` variant), `GET /admin/support` lists `Message where listingId null` queue, `POST /admin/support/:id/confirm` CAS `claimedBy` (`First wins`), auto `Message` from claimer, TTL `30d` same `deleteMany where createdAt <30d` job, `Require login` + `3/day` rate limit.
