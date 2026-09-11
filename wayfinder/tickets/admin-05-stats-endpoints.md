---
label: wayfinder:grilling
status: closed
---
## Question
Should `GET /api/stats` and `GET /api/admin/stats` aggregations filter `where: { seller: { role: { not: "ADMIN" } } }` / `user: { role: { not: "ADMIN" } }` for all counts, and should `admin` dashboard still see raw admin-included numbers behind a toggle or never?

## Resolution
Filter `GET /api/stats` and `GET /api/admin/stats` every count with `role != ADMIN` (users, listings, favorites, views); admin dashboard never shows inclusive raw — single source, no toggle.
