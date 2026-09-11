---
label: wayfinder:grilling
status: closed
---
## Question
What exactly are the “live stats” to cache — `activeListings`/`totalUsers`/`students`/`whatsappMembers`/`whatsappCommunity` from `GET /api/stats` vs admin `totalListings` etc. — and should they be one `trend-tribe:stats` cache entry or separate keys per section (hero vs admin vs PWA)?

## Resolution
Cache hero `GET /api/stats` only (`activeListings`, `totalUsers`, `whatsappMembers` + `community` if present) as single `hero` key — that's the blank line on first load. Admin `totalListings` and PWA stats separate, not cached for placeholder (admin not first-load critical). One key keeps ponytail.
