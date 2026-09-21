# mkt-02-offer-clarity — CLOSED (draft, pending confirm)

## Question
What does the homepage promise to a new user: marketplace-only (Verified Shop) as primary promise, with Gigs/Tasks + Services as secondary/power-user surfaces — or keep the current 3-in-1 `HomePage.jsx:33`? Decision fixes nav, hero, and what we hide/secondary.

## Resolution
**Marketplace-only hero locked (draft)** — `HomePage.jsx:26-47` hero sells Verified Shop only. Gigs/Tasks + Services move to secondary nav/power-user tab, not hero. You chose `Unanswered` → defaulted to Recommended to unblock frontier; reply to change. Saved locally, not pushed.

## Type
wayfinder:grilling

## Notes
- HITL
- Call Skill tool twice: `grilling` + `domain-modeling`
- Reads: `frontend/src/pages/HomePage.jsx:26-47`, `frontend/src/pages/GigsPage.jsx:1`, `backend/prisma/schema.prisma:330-427`

## Blocking
- Blocks: mkt-04-hero-copy, mkt-05-channel-plan
- Blocked by: mkt-01-category-enemy
