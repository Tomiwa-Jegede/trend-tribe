---
label: wayfinder:grilling
---
## Question
Fix “active in chat still Offline” — presence should be `socket connected` + `visible` + `recent typing/message within 2min` = Online, `2min` decay, in-memory `onlineCounts` vs DB/Redis for multi-instance — how to make `GET /messages/presence` and `ticks` (`✓`/`✓✓` grey/blue) accurate without leaking privacy?
