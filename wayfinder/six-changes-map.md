# Wayfinder Map — Six Changes Without Bugs/Security Holes

## Destination
Six TrendTribe changes shippable without bugs or security holes: category ↔ Browse sync (URL truth), chat input pinned above keyboard, presence Online (all signals, 2min), new-message indicator (list pill → thread), admin tiers Top Jegede01 vs Basic (block all money), Contact Us per-user thread with admin Confirm lock — spec ready to build.

## Notes
- Domain: TrendTribe marketplace — `MarketplacePage`/`FilterBar`, `ChatThread`/`InboxPage`, `realtime` presence, `NotificationBell`, `AdminRoute`, `Message`/`Conversation`, `Push`
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for chat/scroll, `ponytail` for minimal fix
- Stack: React 19 + VitePWA `h-[100dvh]` `interactive-widget`, Prisma `Message` `Conversation` `User.role`, Socket.IO + Pusher, Workbox
- Clarified: URL truth, Discover disabled, dvh + safe-area, all signals 2min, pill → thread, hardcode `Jegede01`, all money routes blocked, Contact Us one thread per user, `Require login`, `3/day`, `First wins`, `/admin/support`, `Auto-delete 30d`, `Auto hello only`

## Decisions so far
- [01-category-sync](tickets/six-01-category-sync.md): URL `?category=`/`?subcategory=` + `?page=` is truth; `Browse by Category` → `navigate(/marketplace?category=VALUE)` pre-fills `FilterBar`; `FilterBar` change → `setSearchParams({category,subcategory,page:1})` with `replace:true` and equality guard to avoid loop; `Discover` (`?view=discover`) disables category sync (stays `sort=random`); back/forward syncs `FilterBar` state from URL via `useEffect([searchParams])`; single source avoids `FilterBar` ↔ `Browse` drift.
- [02-chat-input-pinned](tickets/six-02-chat-input-pinned.md): `viewport-fit=cover, interactive-widget=resizes-content`, overlay `fixed inset-0 h-[100dvh]` + `ChatThread h-full flex-1 min-h-0`, list `flex-1 overscroll-contain`, input `sticky bottom-0 pb-[env(safe-area)]`, `visualViewport` resize + `onFocus` scroll — shipped `7b64280`.
- [03-presence-online](tickets/six-03-presence-online.md): All signals `socket>0` OR `visible` OR `lastActive<2min` = Online; `realtime.js` `lastActiveAt` Map on `typing`/`message`, `isOnline` checks 120s; ticks `✓` offline, `✓✓ grey` delivered/online, `✓✓ blue` read.
- [04-new-message-indicator](tickets/six-04-new-message-indicator.md): `InboxPage` `unreadCount` pill → tap opens `?thread=listingId-otherId`, `Navbar` hamburger badge `inbox+notif` via `useRealtime` + tombstones, no poll race.
- [05-admin-tiers](tickets/six-05-admin-tiers.md): Keep `Role.ADMIN`, `isTopAdmin=user.username==="Jegede01"`; `requireTopAdmin` middleware 403 on Treasury (PlatformProfit/GigWithdrawals/Fees/TokenPurchase/wallet), UI hides Treasury.
- [06-contact-us](tickets/six-06-contact-us.md): Reuse `Message`/`Conversation` `listingId=null`, per-user thread, `/admin/support` queue, `POST /admin/support/:id/confirm` CAS `First wins` + auto `Hi, my name is X`, `3/day` limit, `30d` TTL, `Require login`.

## Not yet specified
<!-- all tickets closed — way clear, ready to build -->

## Out of scope
- Email notification for Contact Us (future)
- Offline full chat fallback
