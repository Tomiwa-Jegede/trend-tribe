# Wayfinder Map — Chat Two Scroll Zones

## Destination
Chat has two independent scroll zones: message list `flex-1 overflow-y-auto` scrolls normally, input bar is `fixed` (or `sticky` bottom) locked directly above keyboard at all times — never scrolls away with messages; on keyboard open input moves up with it, on close returns, never scrollable with page.

## Notes
- Domain: `ChatThread.jsx` input + list, `InboxPage` fixed overlay
- Skills every session should consult: `ui-ux-pro-max` for keyboard/scroll UX, `ponytail` for minimal fix
- Stack: React 19 + Tailwind `flex flex-col h-[100dvh]` `visualViewport` `interactive-widget=resizes-content` `safe-area`

## Decisions so far
- [chat-two-01-input-position](tickets/chat-two-01-input-position.md): Input `shrink-0` flex sibling at bottom of `flex flex-col h-[100dvh]` — not fixed/absolute — never scrolls with messages, stays above keyboard via `dvh` resize.
- [chat-two-02-list-scroll](tickets/chat-two-02-list-scroll.md): List `flex-1 min-h-0 overflow-y-auto overscroll-contain` with input outside scroll — no `calc`.

## Not yet specified
- How list resizing should work — `flex-1 min-h-0` vs `height: calc(100dvh - input - header)` vs `visualViewport.height` JS
- How to handle keyboard open/close — `visualViewport` resize vs `interactive-widget` `dvh` vs `env(keyboard-inset-height)` for input `bottom`
- How to prevent page scroll from moving input — `fixed inset-0` overlay vs `overflow-hidden` on container vs `body` scroll lock
- PWA vs browser differences for `visualViewport` and `safe-area`

## Out of scope
- Frederick bubble (separate)
- Desktop keyboard
