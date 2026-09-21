# mkt-08-pricing-bundle — CLOSED

## Question
Which Showcase Pass packs anchor the spec: keep 5-pack as default Most Popular `PricingPage.jsx:10`, kill 1-pack, price 5/10/20 at ₦1000/2000/4000, and Gig Wallet interplay (buy Pass with Gig balance `PricingPage.jsx:27` at 1 Pass = ₦200) — or adjust ladder?

## Type
wayfinder:grilling

## Notes
- HITL — locks bundle ladder for pricing page + paywall
- Call Skill tool twice: `grilling` + `domain-modeling`
- Reads: `frontend/src/pages/PricingPage.jsx:8-14`, `backend/prisma/schema.prisma:42-57`
- Blocked by: mkt-07-pricing-signal (closed)

## Blocking
- Blocks: mkt-12-referral-incentive


## Resolution
**5-pack ₦1000 Most Popular locked** — Keep 5-pack ₦1000 as Most Popular default `PricingPage.jsx:10`, ladder 5/10/20 = ₦1000/2000/4000, Gig Wallet buys Pass at 1 Pass = ₦200 `PricingPage.jsx:27` — kill 1-pack. Saved locally, not pushed.
