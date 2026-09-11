# Wayfinder Map — Hamburger Notification Badge System

## Destination
Hamburger shows single total unread badge (sum of all sections); when opened, each menu item shows its own badge, and dropdowns (Services → Messages/Inbox etc.) show child badges that sum correctly — all badges share one synced source, no duplicate polls, no stale counts, no race on read.

## Notes
- Domain: TrendTribe nav — `Navbar.jsx` hamburger, `NotificationBell.jsx`, `InboxPage`/`Chat`, `Services` dropdown, `Admin` areas
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for badge UI, `ponytail` for minimal fix
- Stack: React 19 + `useRealtime` (Pusher/Socket) + `api.get("/messages/unread-count", "/notifications/unread-count", "/gigs/available", "/bookings")`, `AuthContext`, Workbox

## Decisions so far
- [badge-01-total-composition](tickets/badge-01-total-composition.md): Hamburger total = `messages unread (chat, listingId not null, role != ADMIN)` + `notifications unread` only. Gigs `availableCount` and `bookings pending` are not unread — they are availability, not personal inbox — excluded. Admin support unread counts as `notifications` already (support emits `notification`); no extra top-level sum.
- [badge-02-single-source](tickets/badge-02-single-source.md): Single `useUnreadCounts` hook in `Navbar.jsx` does `Promise.all([/messages/unread-count, /notifications/unread-count])` once, exposes `inboxUnread/notifUnread/total`, single `useRealtime("message"/"notification")` invalidation, no duplicate `NotificationBell` internal poll — `NotificationBell` reuses same counts via props/context. No new batched endpoint (ponytail).
- [badge-03-per-item-mapping](tickets/badge-03-per-item-mapping.md): `Chats /chat` → `inboxUnread`, `Inbox /inbox` → no badge (system 0), `Favorites /saved` → no badge, `Bookings` → no badge in hamburger total (pending is not unread), `Gigs` → no badge, `Admin` → no badge.
- [badge-04-dropdown-aggregation](tickets/badge-04-dropdown-aggregation.md): `Services` parent badge = sum of children badges (currently `inboxUnread` only when child `Chats` has count); children badges shown only when dropdown open; collapsed parent shows sum as dot/count.
- [badge-05-clearing-behavior](tickets/badge-05-clearing-behavior.md): Badge clears on `message:read` / `PATCH /messages/:id/read` / `read-all` realtime, not on hamburger open; poll 5s uses tombstone `pendingDeletesRef` to avoid resurrecting stale `unreadCount`.

## Not yet specified
<!-- all tickets closed — way clear -->

## Out of scope
- Push notification badge (OS icon) — separate PWA badge
- Email unread sync
