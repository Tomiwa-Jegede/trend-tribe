---
label: wayfinder:grilling
status: closed
---
## Question
Should `TokenPurchase`/`GigTokenPurchase`/`PlatformProfit` (token sold, gig fees) created by admin be excluded from `profitGross`/`tokenSold`/`revenue` stats and from `PlatformProfit` aggregation, even though `tokenBalance` decrement still happens for admin flow testing?

## Resolution
Keep `tokenBalance` decrement for admin flow testing, but `PlatformProfit`/`tokenSold`/`revenue` aggregations already filter `user: { role: { not: "ADMIN" } }` — extend to all profit sources; no new profit row counts admin.
