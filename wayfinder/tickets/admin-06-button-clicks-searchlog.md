---
label: wayfinder:grilling
status: closed
---
## Question
Should generic button clicks (share, report, etc.) and `SearchLog` creation be skipped when `req.user.role===ADMIN`, and should `PWAInstall`/`PushSubscription` from admin be excluded from `pwa/stats`?

## Resolution
Guard `SearchLog.create`, `PWAInstall.create`, `PushSubscription` counting with `if (req.user?.role==="ADMIN") return;` before log; shares/reports from admin still function but not counted.
