# Wayfinder Map — Chat Input Fixed Above Keyboard

## Destination
Chat `ChatThread` message input stays locked fixed directly above the keyboard at all times while keyboard is open, regardless of page scroll — list scrolls underneath, input never moves below keyboard or scrolls away.

## Notes
- Domain: `ChatThread.jsx` input bar, `InboxPage` fixed overlay `h-[100dvh]`, `visualViewport`, PWA keyboard
- Skills every session should consult: `ui-ux-pro-max` for keyboard UX, `ponytail` for minimal fix
- Stack: React 19 + Tailwind, `h-[100dvh]` `interactive-widget=resizes-content`, `position: fixed/sticky`, `visualViewport`

## Decisions so far
- [chat-input-01-position-strategy](tickets/chat-input-01-position-strategy.md): Sticky bottom-0 inside flex h-[100dvh] + interactive-widget, not fixed JS calc.
- [chat-input-02-list-resize](tickets/chat-input-02-list-resize.md): List flex-1 min-h-0 overflow-y-auto, scroll to bottom on visualViewport resize/onFocus.
- [chat-input-03-ios-android](tickets/chat-input-03-ios-android.md): viewport-fit=cover + interactive-widget + env(safe-area), visualViewport fallback.

## Not yet specified
<!-- all tickets closed — way clear -->

## Out of scope
- Desktop keyboard (no virtual keyboard)
- Frederick widget (separate map)
