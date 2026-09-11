---
label: wayfinder:grilling
---
## Question
Should `GET /api/stats` and `GET /api/admin/stats` aggregations filter `where: { seller: { role: { not: "ADMIN" } } }` / `user: { role: { not: "ADMIN" } }` for all counts, and should `admin` dashboard still see raw admin-included numbers behind a toggle or never?
