---
label: wayfinder:research
status: open
---

## Question
Trace every `prisma.notification.create` / `createMany` call site (listing favorite, new listing, message, gig/serviceBooking, withdrawal, dispute, admin broadcast) — which controller + which `type` (e.g. `FAVORITE`, `NEW_LISTING`, `MESSAGE`, `GIG_*`, `SERVICE_*`, `ADMIN_*`) is the sender, and does any single user action create two `Notification` rows (duplicate) or miss `actorId`/`listingId` needed for `NotificationBell` deep-link?
