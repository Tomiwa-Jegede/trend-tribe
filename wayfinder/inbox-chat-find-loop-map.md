# Wayfinder Map — Inbox & Chat Find Loop Holes

## Destination
Inbox (`/inbox`) and Chat (`/chat` + `ChatThread`) are loop-hole free: no duplicate rooms, no stale find/filter loop, no triplicate drift, realtime in sync with browser — audit closed and fixes shipped.

## Notes
- Domain: Inbox/Chat find & loop (InboxPage, ChatThread, DiscoverFeed triplicate, realtime)
- Skills: `ui-ux-pro-max`, `ponytail`, `product-brainstorming`
- Stack: `InboxPage.jsx` conversations/savedChats, `ChatThread.jsx` thread fetch, `DiscoverFeed.jsx` loopItems x3, `useRealtime` + Workbox

## Decisions so far
- [Inbox Dedup Key](tickets/inbox-01-dedup-key.md): Dedup by `otherUser.id` not `key`; `expanded` resolves to real `Conversation.key` if exists else pending `thread-{lid}-{otherId}` — fixed `InboxPage.jsx:77,204,258`.
- [Find Filter](tickets/inbox-02-find-filter.md): No find/search loop — flat list stays, no debounced search; ruled out of scope for this map.
- [Thread Fetch Loop](tickets/chat-03-thread-fetch-loop.md): Removed duplicate `fetchThread()` immediate effect in `ChatThread.jsx:39` — initial load now single `Promise.all(getListingById + getThread)`, `fetchThread` only for realtime SW fallback.
- [Triplicate Drift](tickets/discover-04-triplicate-drift.md): `DiscoverFeed.jsx:232` removed debug `console.log("[wraparound]")`, kept `ResizeObserver` + server `sort=random` only, triplicate `loopItems` now geometry-stable.

## Not yet specified
- Pagination beyond 100 messages / 50 conversations
- Archived vs active loop

## Out of scope
- Email notification loop
- Admin moderation loop
- Inbox find/search — out of scope (ticket inbox-02)
