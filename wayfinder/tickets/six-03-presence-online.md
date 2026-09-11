---
label: wayfinder:grilling
status: closed
---
## Question
Fix “active in chat still Offline” — presence should be `socket connected` + `visible` + `recent typing/message within 2min` = Online, `2min` decay, in-memory `onlineCounts` vs DB/Redis for multi-instance — how to make `GET /messages/presence` and `ticks` (`✓`/`✓✓` grey/blue) accurate without leaking privacy?

## Resolution
All signals: `onlineCounts>0` OR `visible` OR `lastTyping/messageAt within 2min` = Online. Keep `realtime.js` in-memory as primary (ponytail), add `lastActiveAt` Map updated on `typing`/`message` + `presence` emit, `isOnline` checks `now - lastActive < 120000`; multi-instance out of scope (single Render instance); `ticks`: `single ✓` if offline, `✓✓ grey` if `deliveredAt || online`, `✓✓ blue` if `read`.
