# Wayfinder Map — Chat Input Fixed Above Keyboard

## Destination
Chat `ChatThread` message input stays locked fixed directly above the keyboard at all times while keyboard is open, regardless of page scroll — list scrolls underneath, input never moves below keyboard or scrolls away.

## Notes
- Domain: `ChatThread.jsx` input bar, `InboxPage` fixed overlay `h-[100dvh]`, `visualViewport`, PWA keyboard
- Skills every session should consult: `ui-ux-pro-max` for keyboard UX, `ponytail` for minimal fix
- Stack: React 19 + Tailwind, `h-[100dvh]` `interactive-widget=resizes-content`, `position: fixed/sticky`, `visualViewport`

## Decisions so far

## Not yet specified
- Whether input should be `position: fixed` bottom + `bottom: env(keyboard-inset)` vs `position: sticky` inside flex vs `visualViewport` height JS
- How list resizing should work — `flex-1 min-h-0` vs `height: calc(100dvh - input - header)` vs `visualViewport.height` JS
- iOS vs Android keyboard differences (`interactive-widget` support, `safe-area-inset`)
- How to prevent page scroll from moving input when `fixed inset-0` overlay already exists

## Out of scope
- Desktop keyboard (no virtual keyboard)
- Frederick widget (separate map)
