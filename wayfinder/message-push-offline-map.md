# Wayfinder Map — Message Push When Offline/Inactive

## Destination
Message delivery is loophole-free: `POST /api/messages` (and bulk `createMessage`) persists the message, then — only if the recipient is not currently connected via Pusher/Socket or has been inactive for N minutes — sends a Web Push via the same `sendPushToUser` mechanism used for bookings/withdrawals, with decisions locked and spec ready to build (saved locally, not pushed yet).

## Notes
- Domain: `message.controller.js` `createMessage` + `realtime.js` `presence`/`isOnline` + `utils/push.js` `sendPushToUser`
- Stack: Prisma `Message` `Conversation`, Socket.IO + Pusher presence, Web Push `push` table + VAPID, `sendPushToUser` for bookings/withdrawals
- Skills every session should consult: `product-brainstorming` for flow framing, `ponytail` for minimal conditional
- Mode: Planning only — decisions + spec saved locally; no push to remote until user says so

## Decisions so far
- [msg-push-01-eligibility](tickets/msg-push-01-eligibility.md): Use `realtime.isOnline` (`onlineCounts>0 || lastActive<2m`) as single source — Socket+Pusher proxy, no DB `lastSeen`.
- [msg-push-02-payload-mechanism](tickets/msg-push-02-payload-mechanism.md): Reuse `sendPushToUser` with chat shape `title/body 80/url deep-link/tag chat-${id}/badgeCount` (fixed `recipientDeleted + listingId not null + sender role`).
- [msg-push-03-threshold](tickets/msg-push-03-threshold.md): Reuse 2-min `isOnline` threshold, no new env.
- [msg-push-04-timing-save](tickets/msg-push-04-timing-save.md): Fire-and-forget `if (!isOnline) sendPush` after `201` + `emitMessage`, never blocks save, 410 cleans sub.
- [msg-push-05-frontend-permission](tickets/msg-push-05-frontend-permission.md): Soft `Enable` banner on first `/chat` before real permission, dismiss forever, not cold subscribe.

## Not yet specified
- Exact storage for last activity timestamp (realtime presence map vs `User.lastSeen` vs Socket `lastSeen`)
- Whether admin-to-user or system broadcasts also follow same offline-only rule
- Batch push for multiple recipients vs single-recipient `createMessage` (currently one `recipientId` per POST)
- Retry / backoff if push fails due to expired subscription

## Out of scope
- Changing `GET /messages/thread` or `InboxPage` realtime refresh (already handled by Pusher/Socket)
- UI for push permission prompt (already in `PWARegister` + `push` service)
- New notification types beyond `chat` message
