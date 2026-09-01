# Delivery Management

## Purpose

Planning, roadmap, and milestone tracking for cross-team engineering delivery. The engineering half of product planning: how value is built, sequenced by dependency, and shipped. The value thesis lives in `product-management/`.

## Ownership

Owned by the repository root `AGENTS.md`. Value-to-deliver lives in `product-management/`; this folder owns how engineering delivers value, not what the value is.

## Local Contracts

- Use this folder for durable delivery artifacts, not scratch notes.
- `roadmap.md` is the top-level sequencing document.
- Milestone trackers use numbered filenames `milestone-1.md` onward.
- Milestone docs state scope, non-goals, ownership boundaries, execution order, and regression guardrails.
- When a milestone is split/deferred/reprioritized, reflect changes in both `roadmap.md` and the affected milestone files in the same change.
- Milestone docs name the value outcome they deliver by referencing `product-management/value-map.md`.
- Delivery status is not a claim of visible value.

## Work Guidance

- Keep planning docs concrete enough to drive execution.
- Prefer milestone-oriented breakdowns over brainstorming lists.
- Update roadmap and milestone docs when scope, sequencing, or ownership changes.
- Do not duplicate implementation detail owned by code-local AGENTS docs.
- Do not resolve "what value to build next" here — raise it to `product-management/`.

## Verification

- Check links, filenames, and milestone numbering.
- Ensure the root `AGENTS.md` child index references this folder and stays current.

## Child DOX Index

| Path | Owner | Purpose |
| --- | --- | --- |
| `roadmap.md` | delivery-management/ | Top-level sequencing of Trend Tribe milestones and dependency order |
| `milestone-1.md` | delivery-management/ | Auth & trust foundation — register, OTP verify, JWT, password reset, profile |
| `milestone-2.md` | delivery-management/ | Marketplace core — listings CRUD, Cloudinary images, browse/filter/detail |
| `milestone-3.md` | delivery-management/ | Engagement & safety — favorites, reports, admin moderation, Frederick AI |
| `milestone-4.md` | delivery-management/ | Monetization & discovery — tokens/Flutterwave, homepage, GA/SEO |
| `milestone-5.md` | delivery-management/ | Communications & scale — messaging, notifications, My Listings (planned) |

<!-- Add one row per milestone tracker file as milestones are created. -->
