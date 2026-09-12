---
label: wayfinder:research
status: closed
blockedBy: [chat-scroll-01-body-lock, chat-scroll-02-height-strategy]
---

## Question
What is the minimal `overscroll` isolation needed so only `listRef` (`ChatThread.jsx:225` `flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth`) scrolls, never the page/inbox behind, when list is at top/bottom and user drags, or when keyboard focus triggers browser's scroll-into-view? Compare `overscroll-contain` on list alone vs `overscroll-behavior:none` on `html/body` vs `touchmove` `preventDefault` outside `listRef` (`ChatThread.jsx:180-184` pre-fix) — which actually works across iOS Safari / Android Chrome / PWA without breaking native list momentum scroll?

## Resolution
Decision: **`overscroll-contain` on `listRef` only is minimal and correct** (`ChatThread.jsx:225` `overscroll-contain`). `contain` blocks scroll chaining to ancestors at top/bottom without killing local bounce; `overscroll-behavior:none` on `html/body` is heavy — kills bounce + pull-to-refresh globally and breaks address-bar hide, only justified scoped to `display-mode:standalone` if PWA bounce needs it. `touchmove preventDefault` outside `listRef` (`ChatThread.jsx:180-184` pre-fix) is perf-hostile (`passive:false` stalls compositor, needs wheel/touch duplicates, race on flick) — MDN/CSSWG recommend replacing with `contain`. Keyboard `scrollIntoView` is contained by `h-[100dvh]` + `interactive-widget=resizes-content` on Android (no ancestor scroll needed) and `visualViewport -> scrollTop=scrollHeight` on iOS already in `01/02`; no extra body lock needed. Keep current `ChatThread.jsx:225` as sole isolation; do not add global `html/body` rule or `touchmove` handler.
