# mkt-03-trust-badge — CLOSED

## Question
What is the Verified Student Badge spec: visual (student-ID card pill vs check), data shown (school + matric last-4 + fresher `schema.prisma:29` vs full), and surfaces (`ListingCard`, `ListingDetailPage`, hero stats `HomePage.jsx:316-344`)? Need prototype to react to.

## Resolution
**ID-card pill + last-4 locked** — Navy pill `✓ Verified UNILAG · ...4567`, fresher badge `schema.prisma:29` where applicable. Surfaces: ListingCard, ListingDetail, Profile, hero stats row `HomePage.jsx:316`. Prototype asset to be rough ID-card on card. Saved locally, not pushed.

## Type
wayfinder:prototype

## Notes
- HITL — produce cheap rough artifact
- Call Skill tool with `prototype`
- Consult `ui-ux-pro-max`
- Reads: `frontend/src/components/listings/ListingCard*`, `backend/prisma/schema.prisma:23-32`

## Blocking
- Blocks: mkt-04-hero-copy, mkt-06-funnel-event
- Blocked by: mkt-01-category-enemy
