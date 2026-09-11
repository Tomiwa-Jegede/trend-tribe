---
label: wayfinder:grilling
status: closed
---
## Question
Should `POST /messages` (chat `listingId` and support `listingId=null`) skip creating `ContactView`, skip `contactViews` increment, and skip `Notification`/`Message` counts for analytics when sender is admin, and should such messages be excluded from `getConversations`/`unreadCount` stats?

## Resolution
Skip `ContactView`/`contactViews` increment and `Notification` when sender is admin; still create `Message` for functional testing but exclude from `unreadCount`/`getConversations` stats via `sender.role != ADMIN` filter.
