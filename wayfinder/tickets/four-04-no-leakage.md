---
label: wayfinder:research
status: closed
---

## Question
`ChatThread.jsx:51-65` `handleRealtimeMsg` + `fetchThread` (`getThread(listingId, withUser.id)`) and `InboxPage.jsx:87` `getConversations()` + `message.controller.js` `getThread`/`getConversations`/`unreadCount` currently use per-listing `listingId+otherId` (`thread-${lid}-${withId}`) alongside emerging per-person `Conversation @@unique([buyerId,sellerId])` (`map.md:02-thread-identity`). Can a realtime `message` for another `listingId` or another `buyerId/sellerId` leak into open thread via `fetchThread` re-fetch fallback (`!msg.listingId && !msg.senderId` → `fetchThread()`), or via `getConversations` returning admin `role===ADMIN` chats without `where role != ADMIN` filter, and does `InboxPage.jsx:302` early-return URL truth prevent flash of wrong thread? Which `where` clause (`listingId`, `senderId/recipientId`, `role`) is missing?

## Resolution
Research done: `message.controller.js:180` `getThread` with `conversationId` leaks across listings (no `listingId` in `where {conversationId}`) — fix `where {AND:[{conversationId},{listingId}]}` if per-listing canonical, or drop `listingId` and use per-person `thread-${buyerId}-${sellerId}` key (`getConversations:303` `convo.key`). `getConversations:286` leaks admin chats (no `role != ADMIN`) — add `buyer/seller/listingseller role != ADMIN` filter like `unreadCount:152`. `ChatThread.jsx:51` `fetchThread()` fallback should only re-fetch if `new URL(msg.url).searchParams.get("thread")==`${listingId}-${withId}`` to avoid cross-thread flash; early-return `InboxPage.jsx:303` already prevents UI flash.
