---
label: wayfinder:grilling
status: closed
---

## Question
When `ChatThread` (`frontend/src/components/chat/ChatThread.jsx:198`) is open as `fixed inset-0 z-50`, should we lock `body`/`html` (`overflow:hidden`, `position:fixed` + `top:-scrollY`, `overscrollBehavior:none`, `touchmove` blocker as in `ChatThread.jsx:161-196` pre-fix) or rely solely on `fixed inset-0 h-[100dvh] overflow-hidden` + list `overscroll-contain` with no body lock (as decided in `chat-two-04-page-scroll-lock.md`)? Which prevents inbox/page scroll bleed when keyboard opens without breaking `interactive-widget=resizes-content` + `h-[100dvh]` and `visualViewport` on iOS Safari / Android Chrome / PWA?

## Resolution
Decision: **No body/html lock** — keep `ChatThread.jsx:165,198` as `fixed inset-0 z-50 h-[100dvh] overflow-hidden` only, `listRef:225` `flex-1 min-h-0 overflow-y-auto overscroll-contain`, no `position:fixed` body, no `touchmove` blocker. Verified via `ui-ux-pro-max` search + prior `chat-two-04` + manual keyboard test; `interactive-widget=resizes-content` + `dvh` already resizes on Android, `visualViewport` listener stays for iOS. Patched in `ChatThread.jsx:143-160` removal in this effort (commit pending). Scoped `overscroll-behavior:none` only if PWA standalone bounce needs it — not global.
