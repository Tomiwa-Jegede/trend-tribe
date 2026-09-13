---
label: wayfinder:research
status: closed
---

## Question
Which push mechanism should `createMessage` reuse: `utils/push.js` `sendPushToUser(prisma, recipientId, {title, body, url, icon, badge, tag, badgeCount})` as already used for `gig`/`serviceBooking`/`withdrawal` and currently for chat (`message.controller.js:60` `sendPushToUser` with `title "Trend Tribe — New chat message"` `url "/chat?thread=${lid}-${senderId}"` `tag chat-${id}`), and what payload shape (`title`, `body` 80-char slice, `url`, `tag`, `badgeCount` unread) should be kept vs trimmed to match bookings/withdrawals style?

## Resolution
Decision: **Reuse `sendPushToUser(prisma, recipientId, {title, body, url, icon, badge, tag, badgeCount})`** as for bookings — keep chat richer: `title "Trend Tribe — New chat message"`, `body sender: slice(80)`, `url "/chat?thread=${lid}-${senderId}"` deep-link, `tag chat-${id}`, `icon/badge /icon-192.png`, `badgeCount` via `count({recipientId, recipientDeleted:false, read:false, listingId:{not:null}, sender:{role:{not:"ADMIN"}}})` matching `getUnreadCount`. Fire-and-forget `.catch(()=>{})`, no new lib.
