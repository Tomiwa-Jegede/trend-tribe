# Wayfinder Map — Whole Project Loophole Audit

## Destination
Whole Trend Tribe platform loophole-free and shippable: auth, listings (views/favorites/shares/contact), chat (per-person Conversation), payments (tokens/gig wallet), gigs/services, admin — all critical loopholes closed, no open questions before launch.

## Notes
- Domain: Full stack — Prisma/Postgres + Express + Socket.IO/Pusher + React/Tailwind + Cloudinary/Brevo/Flutterwave
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for UI, `ponytail` for minimal fix
- Stack: `User`, `Listing`, `Message/Conversation`, `Favorite`, `PlatformProfit`, `Gig`, `ServiceBooking`, `realtime.js`, `InboxPage/ChatThread`

## Decisions so far
<!-- empty — new map just charted, chat flow map at wayfinder/map.md is separate effort -->

## Not yet specified
- Rate limiting / spam prevention for Contact Seller and message send (how many per minute, what error)
- Blocking / reporting chat participant (UX and data model for block)
- Message edit/delete and product-context after listing sold/deleted
- File/image sharing in chat (reuse Cloudinary or keep text-only for V1)
- Conversation cleanup beyond 30d TTL (manual Delete all vs auto)
- Admin profit audit trail after clear (backup before deleteMany)
- Ghost prune vs boosted/favorited protection (already fixed but needs lock)
- Payment webhook idempotency edge (double-credit race)

## Out of scope
- Gig/Service booking chat separate flow
- End-to-end encryption for chat
- Native mobile app (PWA only for V1)
