---
label: wayfinder:grilling
---
## Question
When does cache update — only on successful `GET /api/stats` (and realtime `listing`/`stats:update` events), not on error — and how to handle stale-while-revalidate, error fallback, and cache age (e.g., ignore cache >24h, show loading instead)?
