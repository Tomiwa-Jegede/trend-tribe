---
label: wayfinder:grilling
status: closed
---
## Question
When does cache update — only on successful `GET /api/stats` (and realtime `listing`/`stats:update` events), not on error — and how to handle stale-while-revalidate, error fallback, and cache age (e.g., ignore cache >24h, show loading instead)?

## Resolution
Write cache only on `200` success (`hero` + `updatedAt=now`) and on realtime `stats:update`/`listing` events; never on error. Read: if `now - updatedAt > 24h` ignore cache → show dash/loading. Error keeps cached stale + retries 30s. Stale-while-revalidate: show cached, fetch in background, fade to fresh.
