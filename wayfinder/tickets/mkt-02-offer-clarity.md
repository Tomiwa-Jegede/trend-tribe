# mkt-02-offer-clarity — CLOSED (re-locked)

## Question
What does the homepage promise to a new user: marketplace-only (Verified Shop) as primary promise, with Gigs/Tasks + Services as secondary/power-user surfaces — or keep the current 3-in-1 `HomePage.jsx:33`? Decision fixes nav, hero, and what we hide/secondary.

## Resolution
**Two-track landing locked** — Split hero: Shop vs Tasks — choose your path. Hero shows two tracks: `Your campus. Your shop.` (left) + `Get things done` (right) `HomePage.jsx:33`, each with own CTA. Validates that marketplace + Gigs share hero equally, not marketplace-only. Re-locked 2026-09-21 locally.

## Type
wayfinder:grilling

## Notes
- HITL
- Call Skill tool twice: `grilling` + `domain-modeling`
- Reads: `frontend/src/pages/HomePage.jsx:26-47`, `frontend/src/pages/GigsPage.jsx:1`, `backend/prisma/schema.prisma:330-427`

## Blocking
- Blocks: mkt-04-hero-copy, mkt-05-channel-plan
- Blocked by: mkt-01-category-enemy
