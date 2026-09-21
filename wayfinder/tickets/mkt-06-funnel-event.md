# mkt-06-funnel-event — CLOSED

## Question
What is the measurable truth for the spec: current funnel Visitor → Sign-up → Verified → First Listing → First ContactView/Favorite (`ListingView:227`, `ContactView:214`, `Favorite:184`, `SearchLog:242`) + stats filters (`/api/stats` excludes admin) — what we can actually read vs what we must instrument for the 30-day test?

## Resolution
**Funnel truth locked (research)** — Readable today: `GET /api/stats` `stats.routes.js:10` (activeListings/totalUsers/whatsappMembers, admin-excluded `role not ADMIN`, 60s cache + socket `stats:update`), `ListingView:227` (views deduped by date), `ContactView:214` + `Listing.contactViews`, `Favorite:184` + `ListingView` realtime `realtime.js:159/178`, `SearchLog:242`, analytics `/api/analytics` favRate/contactRate `analytics.routes.js:58`. Gap to instrument: Visitor→Sign-up needs GA `usePageviewTracking`, Sign-up→Verified needs OTP success event, First Listing→First Contact needs `ContactView` per listing `ContactView:214` (already logged) but no `reply` event — add seller confirm poll. Branch `research/mkt-06-funnel-event` not needed, saved locally.

## Type
wayfinder:research

## Notes
- AFK — subagent calls Skill tool with `research`
- Reads: `backend/prisma/schema.prisma:227-253`, `backend/src/routes/stats*`, `backend/src/controllers/listing*`, `wayfinder/admin-loopholes-map.md`, `wayfinder/live-stats-cache-map.md`
- Candidate for throwaway `research/mkt-06-funnel-event` branch with context pointer

## Blocking
- Blocks: none (frontier, unblocks hero/channel measurement)
- Blocked by: none (frontier — can run in parallel)
