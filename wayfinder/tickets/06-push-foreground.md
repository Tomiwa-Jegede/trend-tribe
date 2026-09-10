# Ticket — Push When Foreground

## Question
`createMessage` always called `sendPushToUser` even when recipient is `isOnline` (app in-focus) — causing native push noise while chat is open. Should we check `isOnline(recipientId)` via `realtime.js onlineCounts` and skip push when online, relying on in-app `message` realtime + toast, and only push when offline/background with deep-link `url: /chat?thread=listingId-senderId` and `badgeCount`?

Label: wayfinder:task
Status: closed
Resolution: Yes — skip push when isOnline true, chat badge only, deep-link to /chat?thread=...
Blocks: 08-persistence
