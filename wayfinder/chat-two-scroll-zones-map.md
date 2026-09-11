# Wayfinder Map — Chat Two Scroll Zones

## Destination
Chat has two independent scroll zones: message list `flex-1 overflow-y-auto` scrolls normally, input bar is `fixed` (or `sticky` bottom) locked directly above keyboard at all times — never scrolls away with messages; on keyboard open input moves up with it, on close returns, never scrollable with page.

## Notes
- Domain: `ChatThread.jsx` input + list, `InboxPage` fixed overlay
- Skills every session should consult: `ui-ux-pro-max` for keyboard/scroll UX, `ponytail` for minimal fix
- Stack: React 19 + Tailwind `flex flex-col h-[100dvh]` `visualViewport` `interactive-widget=resizes-content` `safe-area`

## Decisions so far

## Not yet specified
- Whether input should be `position: fixed` bottom + `visualViewport` vs `position: sticky` bottom inside flex vs `position: absolute` inside `h-[100dvh]`
- How to make list and input independent — `flex-1 min-h-0 overflow-y-auto` for list + `shrink-0` input outside scroll, vs list `height: calc(100dvh - input - header)`
- How to handle keyboard open/close — `visualViewport` resize vs `interactive-widget` `dvh` vs `env(keyboard-inset-height)` for input `bottom`
- How to prevent page scroll from moving input — `fixed inset-0` overlay vs `overflow-hidden` on container vs `body` scroll lock
- PWA vs browser differences for `visualViewport` and `safe-area`

## Out of scope
- Frederick bubble (separate)
- Desktop keyboard
