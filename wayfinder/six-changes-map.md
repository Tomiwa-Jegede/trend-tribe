# Wayfinder Map — Six Changes Without Bugs/Security Holes

## Destination
Six TrendTribe changes shippable without bugs or security holes: category ↔ Browse sync (URL truth), chat input pinned above keyboard, presence Online (all signals, 2min), new-message indicator (list pill → thread), admin tiers Top Jegede01 vs Basic (block all money), Contact Us per-user thread with admin Confirm lock — spec ready to build.

## Notes
- Domain: TrendTribe marketplace — `MarketplacePage`/`FilterBar`, `ChatThread`/`InboxPage`, `realtime` presence, `NotificationBell`, `AdminRoute`, `Message`/`Conversation`, `Push`
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for chat/scroll, `ponytail` for minimal fix
- Stack: React 19 + VitePWA `h-[100dvh]` `interactive-widget`, Prisma `Message` `Conversation` `User.role`, Socket.IO + Pusher, Workbox
- Clarified: URL truth, Discover disabled, dvh + safe-area, all signals 2min, pill → thread, hardcode `Jegede01`, all money routes blocked, Contact Us one thread per user, `Require login`, `3/day`, `First wins`, `/admin/support`, `Auto-delete 30d`, `Auto hello only`

## Decisions so far

## Not yet specified
- Exact Treasury route/API list for “all money” (PlatformProfit, GigWithdrawals, Fees, TokenPurchase, wallet) — needs enumeration
- Contact Us `listingId=null` vs new `SupportTicket` model — needs model decision
- Presence multi-instance (Redis vs DB) for `isOnline` — needs infra choice

## Out of scope
- Email notification for Contact Us (future)
- Offline full chat fallback
