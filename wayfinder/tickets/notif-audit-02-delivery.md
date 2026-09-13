---
label: wayfinder:research
status: open
---

## Question
Trace `realtime.emitNotification` (Pusher/Socket) + `utils/push.js` `sendPushToUser` (Web Push) per notification creation — which path is used for each `type`, is `emitNotification` + `sendPushToUser` both called for same event (duplicate send), and does `push-handler.js` SW suppress `showNotification` when app visible yet still `postMessage` to wake inbox, vs bookings/withdrawals that always push?
