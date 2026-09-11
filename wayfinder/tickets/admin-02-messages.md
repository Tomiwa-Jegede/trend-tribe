---
label: wayfinder:grilling
---
## Question
Should `POST /messages` (chat `listingId` and support `listingId=null`) skip creating `ContactView`, skip `contactViews` increment, and skip `Notification`/`Message` counts for analytics when sender is admin, and should such messages be excluded from `getConversations`/`unreadCount` stats?
