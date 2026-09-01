# Value Chain Opportunities Map

## Purpose
Unexplored gaps and expansion opportunities; value not yet delivered.

## How this map is used

- Opportunities are ranked by stakeholder value, not effort
- Each entry names the value gap and the delivery milestone or exploration that would close it
- Keep entries concise
- Delete entries when the gap closes

## Opportunity Index

| # | Opportunity | Value gap it closes | Rank rationale | Owning delivery | Status |
|---|---|---|---|---|---|
| 1 | In-app messaging (buyer <-> seller chat) | Closes **GAP** V-cross #1 — currently `/messages` is `ComingSoonPage`; coordination leaks to WhatsApp with no in-platform trust trail | Highest frequency next to browsing; directly increases completed meetups; sellers asked for it most | Milestone 5 | Idea |
| 2 | Seller `My Listings` + bulk manage | Closes **GAP** V-cross #2 — sellers cannot view/edit all own listings in one place | Unblocks seller retention; sellers re-list weekly during term | Milestone 5 | Idea |
| 3 | Push + email notifications | Closes **GAP** V-cross #2 — no alert on favorite price drop, report update, or message | Low effort multiplier for V2–V5; keeps engagement after first visit | Milestone 5 | Idea |
| 4 | Search relevance + recommendations | V3 is PARTIAL for large catalogs — text search is basic; no recommendation or recently-viewed | Increases discovery conversion at catalog >200 listings; no new data model needed | Milestone 5 | Idea |
| 5 | `GADGETS` + subcategories + full `Subcategory` coverage | `GADGETS` enum ships but subcategory filters incomplete; many `OTHERS` listings under-categorized | Unlocks a major campus category (phones, accessories, gadgets) with existing schema | Milestone 2 (follow-up) | Scoped |
| 6 | Seller analytics (views, saves, report rate) | Sellers blind to demand; no feedback loop on pricing or photo quality | Motivates better listings; uses existing `Favorite`/`Report` counts | Milestone 5 | Idea |
| 7 | Image optimization + `coverPosition` UX polish | Large Cloudinary images unoptimized for mobile; cover crop is functional but crude | Reduces Home/Marketplace LCP on low-band devices; improves first impression | Milestone 5 | Idea |
| 8 | Playwright e2e expansion + visual diff | Regression risk as milestones 3–5 land; current coverage is smoke/login/create/edit/admin only | Protects every must-not-fail promise; run cost is low (`npm test` root) | Milestone 5 | In progress |
| 9 | Reporting escalation + evidence upload | `ReportReason` is generic; no photo proof or repeat-offender view | Raises admin decision quality without heavy moderation headcount | Milestone 3 (follow-up) | Idea |
| 10 | Token pack promotions + usage metering UX | Token purchase works but pricing/pack clarity in `TokenCallbackPage` is minimal | Converts V7 intent to repeat purchase; prerequisite for sustainable monetization | Milestone 4 (follow-up) | Idea |

Add one row per opportunity. Re-rank periodically as value perceptions change. Delete rows when the gap closes.
