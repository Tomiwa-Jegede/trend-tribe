# Wayfinder Map — Chat Four Fixes

## Destination
Chats tab is loophole-free and shippable: (1) manual multi-select delete for chat threads via Select→checkboxes→Delete selected (plus Delete all), (2) thread header stays fixed at top while list/keyboard move, (3) input is keyboard-anchored (never scrolls with page/list), (4) no cross-user leakage — one thread never shows another conversation's messages — with spec ready to build.

## Notes
- Domain: `InboxPage.jsx` Chats tab (`/chat` `isChat` `finalConvos` `conversations` `savedChats`), `ChatThread.jsx` (`header` `listRef` `inputRef` `form sticky`), `messageService` + `message.controller` `getThread`/`getConversations`, `App.jsx` `isChatThreadOpen`, `realtime` `useRealtime("message")`
- Stack: React 19 + Tailwind `fixed inset-0 h-[100dvh]` `flex flex-col` `overscroll-contain`, Prisma `Message {listingId, senderId, recipientId}` `Conversation` `role ADMIN`
- Skills every session should consult: `ui-ux-pro-max` for header/input UX, `ponytail` for minimal fix
- Mode: Planning only — decisions + spec, no deliverables until map clears

## Decisions so far
- [four-01-multiselect-delete](tickets/four-01-multiselect-delete.md): Chats Select→checkbox on each row + Delete selected (bulk, tombstone) + Delete all kept separate.
- [four-02-header-fixed](tickets/four-02-header-fixed.md): Header `shrink-0 sticky top-0 z-10` inside fixed overlay — never moves with list/keyboard.
- [four-03-input-keyboard](tickets/four-03-input-keyboard.md): Input `shrink-0 sticky bottom-0` inside fixed h[100dvh] — keyboard pushes overlay, input never scrolls with list.
- [four-04-no-leakage](tickets/four-04-no-leakage.md): `getThread` must filter `listingId` with `conversationId`, `getConversations` must filter `role != ADMIN`, `fetchThread` fallback guarded by URL `thread` param.

## Not yet specified
- Select mode UX details: where checkbox sits on row, selected count badge, Delete selected confirm copy, empty state after delete
- Header fixed vs safe-area notch: does header need `pt-[env(safe-area-inset-top)]` or keep `px-4 py-3` only
- Keyboard container: `interactive-widget` vs `virtualKeyboard` API vs `visualViewport` vs `position:fixed bottom:0` — which actually anchors to keyboard on iOS/Android/PWA without jank
- Leakage scope: per-listing vs per-person thread identity (`listingId+otherId` vs `buyerId+sellerId` merge from `map.md:02-thread-identity`), admin `role != ADMIN` filters in `getConversations`/`unreadCount`

## Out of scope
- Inbox `/inbox` system messages multi-delete (already exists, not this map)
- Frederick widget, gig/service booking chat
- Marketplace / listing CRUD beyond chat thread product card
