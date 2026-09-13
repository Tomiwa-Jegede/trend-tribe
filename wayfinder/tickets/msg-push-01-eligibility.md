---
label: wayfinder:research
status: closed
---

## Question
For `POST /api/messages` `createMessage` (`backend/src/controllers/message.controller.js:5`), which signal defines "recipient not connected / inactive": `realtime.isOnline(recipientId)` (Socket + Pusher presence map), `presence` `lastSeen` timestamp, Socket `presence:ping` 60s interval, or `User` `lastSeen`? Should we treat recipient as online if either Socket or Pusher reports connected, and what is the single source of truth for `isOnline` already used for `typing`/`presence` and for `bookings` push suppression?

## Resolution
Decision: **Use `realtime.isOnline(recipientId)` as single source** — `onlineCounts>0 || lastActive <2m` (`realtime.js:15` `2*60*1000`). `lastSeen` is display only, no `User.lastSeen` DB column, `presence:ping 60s` (`ChatThread.jsx:102`) keeps `lastActive` fresh. Pusher is mirror via `emitPresence`, no separate count — `isOnline` covers both. Ponytail: no new env, reuse 2-min already used for ticks/presence.
