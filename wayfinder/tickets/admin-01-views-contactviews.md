---
label: wayfinder:grilling
---
## Question
Should `GET /listings/:id` view increment (`ListingView` + `views` + realtime `listing:viewed`) and `ContactView`/`contactViews` be skipped entirely when `req.user.role===ADMIN` or `viewerId` is admin, or still increment display `views` but exclude from `getDisplayViews`/`stats` aggregation?
