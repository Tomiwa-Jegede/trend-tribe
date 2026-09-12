---
label: wayfinder:grilling
status: closed
blockedBy: [admin-loop-03-marketplace-leak]
---

## Question
Is every counter/stat excluded for `role===ADMIN` inclusively: `views`, `contactViews`, `favorites`, `messages`/`conversations`/`unreadCount`, `notifications`, `tokenPurchases`, `PlatformProfit`, `pwa.controller.js` share views, as required by `admin-exclude-analytics-map.md`? Check gaps: `admin.routes.js:326` `GET /admin/favorites` counts all without filter, `admin.routes.js:51` `where seller.role != ADMIN` covers some but not `GET /admin/listings` totalCount, `message.controller` `unreadCount` excludes `role != ADMIN` but `GET /admin/messages` broadcast includes admins as recipients. Which counters still include admin and need `where user.role != ADMIN` or `seller.role != ADMIN`?

## Resolution
Decision: **Filter public, keep admin view**. Public `favoriteCount`/`views` aggregation excludes `role===ADMIN` (as with `03` marketplace fix), `/api/stats` + `/admin/stats` already `role != ADMIN`, `pwa.controller` already skipped. `GET /admin/favorites` stays unfiltered for admin audit (shows who favorited what incl. admins for forensics) but its `totalCount` for stats is not used for public. Broadcast/share keeps admin recipients excluded via separate ticket `06`. No new filter for admin view V1.
