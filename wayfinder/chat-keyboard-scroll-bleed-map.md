# Wayfinder Map — Chat Keyboard Scroll Bleed

## Destination
ChatThread scroll isolation is loophole-free and shippable: when thread is open and keyboard opens/closes, the inbox/page behind never scrolls, the input stays pinned directly above the keyboard, and only the message list scrolls — independently — on iOS Safari, Android Chrome, and PWA (standalone) — with decisions locked and fix shipped in place.

## Notes
- Domain: `ChatThread.jsx` fixed overlay, `InboxPage.jsx` thread entry (`?thread` vs `expanded`), `App.jsx` `isChatThreadOpen`, `index.html` `viewport-fit=cover interactive-widget=resizes-content`
- Stack: React 19 + Tailwind `h-[100dvh]` `visualViewport` `overscroll-contain` `sticky bottom-0` `env(safe-area-inset-bottom)`
- Skills every session should consult: `ui-ux-pro-max` for keyboard/scroll UX, `ponytail` for minimal fix
- Mode: Plan + fix in place (execution carried into map) — verified with `npm run build` + manual keyboard matrix, `npm test` does not cover this
- Prior art: `chat-two-scroll-zones-map.md` and `chat-input-fixed-map.md` already decided `h-[100dvh]` + `overscroll-contain` + no body lock, but `ChatThread.jsx:162-196` re-introduced `body position:fixed` + JS `vvHeight/vvOffsetTop` regressing on keyboard open — this map audits that regression

## Decisions so far
- [chat-scroll-01-body-lock](tickets/chat-scroll-01-body-lock.md): No body/html lock — `fixed inset-0 h-[100dvh] overflow-hidden` + `overscroll-contain` only; drop `position:fixed` body + `touchmove` blocker, keep `visualViewport` for iOS.
- [chat-scroll-02-height-strategy](tickets/chat-scroll-02-height-strategy.md): Overlay height is `h-[100dvh]` + `interactive-widget=resizes-content` only; no JS `visualViewport` height/top inline — JS only scrolls list to bottom on keyboard.
- [chat-scroll-03-entry-paths](tickets/chat-scroll-03-entry-paths.md): Single URL truth `?thread=listingId-otherId` is canonical early-return; drop `expanded` inline IIFE + unify `App.jsx:122` hide — one fixed overlay path, no background list mounted.
- [chat-scroll-04-overscroll-chain](tickets/chat-scroll-04-overscroll-chain.md): `overscroll-contain` on `listRef:225` only is minimal — no global `html/body none`, no `touchmove preventDefault`; `h-[100dvh]` + `visualViewport` already contains keyboard scroll.
- [chat-scroll-05-keyboard-keep-bottom](tickets/chat-scroll-05-keyboard-keep-bottom.md): Keep both `visualViewport resize/scroll` + `onFocus rAF scrollTop=scrollHeight` only if `activeElement===inputRef` — iOS needs JS, Android covered by `dvh`.
- [chat-scroll-06-verify-matrix](tickets/chat-scroll-06-verify-matrix.md): Matrix done — `npm run build` ✓, manual keyboard bleed test on iOS/Android/PWA (header/product vs list drag, open via URL vs row, close), pass = no background scroll.

## Not yet specified
- PWA standalone vs browser `display-mode` differences for `100dvh` vs `100vh` fallback and status bar
- iOS elastic bounce / rubber-band at list top/bottom leaking to page despite `overscroll-contain`
- Safe-area + keyboard inset interaction (`env(safe-area-inset-bottom)` + `interactive-widget` height on notched devices)
- Product card (`ChatThread.jsx:216`) height shrinking list `flex-1 min-h-0` when keyboard open — does list remain independently scrollable?
- Inbox persistence (`tt_saved_chats` vs `Conversation`) interaction when overlay covers list — does close vs delete leak scroll state?

## Out of scope
- Frederick bubble/widget (separate map)
- Desktop keyboard / physical keyboard scenarios
- Gig/Service booking chat (different flow)
- End-to-end encryption, message edit/delete, image sharing in chat
