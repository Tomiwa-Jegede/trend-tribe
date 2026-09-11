# Wayfinder Map — Hamburger Notification Badge System

## Destination
Hamburger shows single total unread badge (sum of all sections); when opened, each menu item shows its own badge, and dropdowns (Services → Messages/Inbox etc.) show child badges that sum correctly — all badges share one synced source, no duplicate polls, no stale counts, no race on read.

## Notes
- Domain: TrendTribe nav — `Navbar.jsx` hamburger, `NotificationBell.jsx`, `InboxPage`/`Chat`, `Services` dropdown, `Admin` areas
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for badge UI, `ponytail` for minimal fix
- Stack: React 19 + `useRealtime` (Pusher/Socket) + `api.get("/messages/unread-count", "/notifications/unread-count", "/gigs/available", "/bookings")`, `AuthContext`, Workbox

## Decisions so far
- [badge-01-total-composition](tickets/badge-01-total-composition.md): Hamburger total = `messages unread (chat, listingId not null, role != ADMIN)` + `notifications unread` only. Gigs `availableCount` and `bookings pending` are not unread — they are availability, not personal inbox — excluded. Admin support unread counts as `notifications` already (support emits `notification`); no extra top-level sum.

## Not yet specified
- Single source of unread counts to avoid N polls and sync drift
- Per-item badge mapping for hamburger rows and dropdown children
- When badges clear (on open vs on read vs on navigation)
- Aggregation rule for dropdown parent badge (sum vs max vs dot)
- Fetch strategy — one batched endpoint vs separate calls

## Out of scope
- Push notification badge (OS icon) — separate PWA badge
- Email unread sync
