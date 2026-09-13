---
label: wayfinder:grilling
status: closed
blockedBy: [msg-push-01-eligibility]
---

## Question
What is N for "hasn't had activity in last N minutes": 2 min (matches `realtime.js` presence `onlineCounts` 2-min window and `ChatThread` 60s `presence:ping` + `2min` visible), 5 min (common booking push delay), or another value? Should N reuse the existing `isOnline` 2-min threshold as single source, or define a separate `MESSAGE_OFFLINE_THRESHOLD` env/config for Web Push only?

## Resolution
Decision: **Reuse 2 min** — keep `isOnline` `2*60*1000` as single N, no new env. Matches `realtime.js:15` + `ChatThread` 60s ping + ticks, ponytail minimal.
