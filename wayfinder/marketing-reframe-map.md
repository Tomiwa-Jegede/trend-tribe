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
- [mkt-02-offer-clarity](tickets/mkt-02-offer-clarity.md): Marketplace-only hero (Verified Shop primary), Gigs/Services secondary — draft, pending confirm (you answered Unanswered → defaulted to Recommended).
- [mkt-07-pricing-signal](tickets/mkt-07-pricing-signal.md): Token → Showcase Pass, kill 1-pack, reword PricingPage hero to shop slots + 24h spotlight.
- [mkt-03-trust-badge](tickets/mkt-03-trust-badge.md): ID-card pill ✓ Verified UNILAG · ...4567 on ListingCard/ListingDetail/Profile + hero stats.
- [mkt-04-hero-copy](tickets/mkt-04-hero-copy.md): Hero `Don't Sell on Status. Open Your Verified Shop.` CTA `Open My Shop Free →` with B/C variants for A/B.
- [mkt-05-channel-plan](tickets/mkt-05-channel-plan.md): 70 TikTok / 20 WA+Posters (yellow QR + Meetup Spot) / 10 Ambassadors via Showcase Pass + ReferralCommission.
- [mkt-06-funnel-event](tickets/mkt-06-funnel-event.md): Funnel readable via /api/stats (admin-excluded) + ListingView/ContactView/Favorite/SearchLog + realtime; gap is reply tracking — instrument poll.

## Not yet specified
- Pricing bundle architecture after Showcase Pass rename (which pack is default, anchor price for 5 vs 1, Gig Wallet interplay)
- Physical poster & meetup ritual spec (design, QR per faculty, ambassador comp)
- Founder story content scripts (first 10 TikTok hooks + filming constraints)
- Empty-state & post-listing ritual copy (peak-end, referral cue)
- Referral incentive tied to Showcase Pass (Invite course mates → free pass)
- SEO/OG copy alignment after reframe (`frontend/index.html:24`, `HomePage.jsx:160-173`)

## Not yet specified
- Pricing bundle architecture after Showcase Pass rename (which pack is default, anchor price for 5 vs 1, Gig Wallet interplay)
- Physical poster & meetup ritual spec (design, QR per faculty, ambassador comp)
- Founder story content scripts (first 10 TikTok hooks + filming constraints)
- Empty-state & post-listing ritual copy (peak-end, referral cue)
- Measurement & funnel truth (stats endpoints exclude admin, what we can actually read from `ListingView`/`ContactView`/`SearchLog`)
- Referral incentive tied to Showcase Pass (Invite course mates → free pass)
- Gigs/Services separation vs homepage promise — what new user sees first (marketplace-only vs multi-product)
- SEO/OG copy alignment after reframe (`frontend/index.html:24`, `HomePage.jsx:160-173`)

## Out of scope
- Building the features/change deployment itself — map produces spec to hand off
- Backend verification logic change (keep matric/JAMB flow as is)
- Paid media buying/execution beyond spec (spec defines what to buy, not buying it)
