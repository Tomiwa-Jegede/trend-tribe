# mkt-06-funnel-event

## Question
What is the measurable truth for the spec: current funnel Visitor → Sign-up → Verified → First Listing → First ContactView/Favorite (`ListingView:227`, `ContactView:214`, `Favorite:184`, `SearchLog:242`) + stats filters (`/api/stats` excludes admin) — what we can actually read vs what we must instrument for the 30-day test?

## Type
wayfinder:research

## Notes
- AFK — subagent calls Skill tool with `research`
- Reads: `backend/prisma/schema.prisma:227-253`, `backend/src/routes/stats*`, `backend/src/controllers/listing*`, `wayfinder/admin-loopholes-map.md`, `wayfinder/live-stats-cache-map.md`
- Candidate for throwaway `research/mkt-06-funnel-event` branch with context pointer

## Blocking
- Blocks: none (frontier, unblocks hero/channel measurement)
- Blocked by: none (frontier — can run in parallel)
