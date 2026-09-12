---
label: wayfinder:grilling
status: closed
blockedBy: [admin-loop-04-analytics-exclusion]
---

## Question
Admin messaging `POST /api/admin/messages/broadcast` (`admin.routes.js:487`) and `POST /listings/:id/share` (`568`) create `Message` + `Notification` for every `user.id != req.user.id` (including other ADMINs) with 5000 char limit and 800-batch `createMany`, then `emitMessage` + `sendPushToUser` + optional `POST /messages/notify-email` background Brevo throttled 400ms. Should broadcasts exclude `role===ADMIN` recipients, enforce rate limit / idempotency, chunk push to avoid N+1 `notification.count` query, and should `share` auto-filter `listing.seller.role===ADMIN` test listings? Which is source of inbox pollution when admin tests?

## Resolution
Decision: **Exclude admins + chunk**. `broadcast`/`share` filter `recipientIds` where `role != ADMIN` (skip other admins), `share` also skips `listing.seller.role===ADMIN` test listings, keep 5000 limit + 800 batch, `sendPushToUser` stays chunked but batch `notification.count` via single `groupBy` not N+1 (future). Brevo notify keeps 400ms throttle. Ponytail: one `where role != ADMIN` filter fixes inbox pollution.
