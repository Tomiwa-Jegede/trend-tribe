# Wayfinder Map — Marketing Reframe to Verified Campus Shop

## Destination
Hand-off spec for reframing Trend Tribe as the Verified Campus Shop Network — category/enemy/promise, Showcase Pass pricing, trust signals, hero copy, social proof, channel plan, and 30-day test plan — decisions locked and ready to build without re-deciding.

## Notes
- Domain: Trend Tribe marketing — student marketplace (matric/JAMB verified sellers `backend/prisma/schema.prisma:23-32`, 3 free listings + token `frontend/src/pages/PricingPage.jsx:8-14`, WhatsApp contact `frontend/src/pages/HomePage.jsx:332`, Gigs escrow `backend/prisma/schema.prisma:330`)
- Skills every session should consult: `product-brainstorming` for positioning, `ui-ux-pro-max` for badge/hero UX, `ponytail` for minimal spec
- Standing preferences: concise, direct, technical; reference `path:line`; verify via local data, not assumptions; Rory Sutherland lens (perception, signaling, trust, status)
- Mode: Planning only — decisions + spec, no code/content deliverables until map clears (per Wayfinder default)

## Decisions so far
- [mkt-01-category-enemy](tickets/mkt-01-category-enemy.md): Locked **Verified Campus Shop** — hybrid Passport+Storefront. Positioning `Your campus. Your shop. Verified.` Category: Verified Campus Shop Network, Enemy: Strangers/Status/Jiji, Promise: Be seen, sell to verifiables, meet on campus.
- [mkt-02-offer-clarity](tickets/mkt-02-offer-clarity.md): Two-track landing — split hero Shop vs Tasks, choose path (re-locked).
- [mkt-07-pricing-signal](tickets/mkt-07-pricing-signal.md): Token → Showcase Pass, kill 1-pack, reword PricingPage hero to shop slots + 24h spotlight.
- [mkt-03-trust-badge](tickets/mkt-03-trust-badge.md): ID-card pill ✓ Verified UNILAG · ...4567 on ListingCard/ListingDetail/Profile + hero stats.
- [mkt-04-hero-copy](tickets/mkt-04-hero-copy.md): Split headline — Left `Open Your Verified Shop` + Right `Get Things Done on Campus` dual CTA, shared trust strip (re-locked Two-track).
- [mkt-05-channel-plan](tickets/mkt-05-channel-plan.md): 70 TikTok / 20 WA+Posters (yellow QR + Meetup Spot) / 10 Ambassadors via Showcase Pass + ReferralCommission.
- [mkt-06-funnel-event](tickets/mkt-06-funnel-event.md): Funnel readable via /api/stats (admin-excluded) + ListingView/ContactView/Favorite/SearchLog + realtime; gap is reply tracking — instrument poll.
- [mkt-08-pricing-bundle](tickets/mkt-08-pricing-bundle.md): 5-pack ₦1000 Most Popular, ladder 5/10/20, Gig Wallet 1 Pass = ₦200.
- [mkt-09-poster-ritual](tickets/mkt-09-poster-ritual.md): Poster `Don't Buy From Strangers. Buy From Your Classmate.` yellow QR/tent, ambassador Pass + commission.
- [mkt-10-founder-scripts](tickets/mkt-10-founder-scripts.md): Lead hook perfume friend invisible + 9 scripts, iPhone hostel, 2 boosted.
- [mkt-11-empty-ritual](tickets/mkt-11-empty-ritual.md): Empty `Be first 48h free` + post-listing `Your Shop is Live! Share to Status`.
- [mkt-12-referral-incentive](tickets/mkt-12-referral-incentive.md): Both get 1 Showcase Pass via ReferralCommission.
- [mkt-13-seo-og](tickets/mkt-13-seo-og.md): Title `Verified Campus Shop` + OG `Your campus. Your shop. Verified.`

## Not yet specified
<!-- all tickets closed — way clear, ready to hand off spec -->

## Out of scope
- Building the features/change deployment itself — map produces spec to hand off
- Backend verification logic change (keep matric/JAMB flow as is)
- Paid media buying/execution beyond spec (spec defines what to buy, not buying it)
