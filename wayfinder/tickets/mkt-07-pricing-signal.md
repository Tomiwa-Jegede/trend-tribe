# mkt-07-pricing-signal — CLOSED

## Question
Do we rename Token → Showcase Pass/Spotlight in the spec, kill the 1-pack anchor `PricingPage.jsx:9`, and reword `PricingPage.jsx:70` to sell visibility not currency — or keep token but reframe description to shop slots? Decision fixes pricing page hero and paywall copy.

## Resolution
**Showcase Pass locked** — Token → Showcase Pass. Kill 1-pack, anchor at 5-pack `PricingPage.jsx:9`. Hero reword: `Your Shop: 3 slots free. 1 Showcase Pass (₦200) opens your 4th slot + 24h spotlight.` Saved locally, not pushed.

## Type
wayfinder:grilling

## Notes
- HITL
- Call Skill tool twice: `grilling` + `domain-modeling`
- Reads: `frontend/src/pages/PricingPage.jsx:8-116`, `backend/prisma/schema.prisma:42-57`
- Blocked by: mkt-01-category-enemy, mkt-02-offer-clarity

## Blocking
- Blocks: mkt-04-hero-copy
