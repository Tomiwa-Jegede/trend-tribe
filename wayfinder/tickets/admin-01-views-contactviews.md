---
label: wayfinder:grilling
status: closed
---
## Question
Should `GET /listings/:id` view increment (`ListingView` + `views` + realtime `listing:viewed`) and `ContactView`/`contactViews` be skipped entirely when `req.user.role===ADMIN` or `viewerId` is admin, or still increment display `views` but exclude from `getDisplayViews`/`stats` aggregation?

## Resolution
Skip entirely when `req.user.role===ADMIN` — no `ListingView.create`, no `views++`, no `emitListingView`, no `ContactView`/`contactViews`. Display `views` via `getDisplayViews` stays but real count not polluted.
