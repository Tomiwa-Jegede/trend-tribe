---
label: wayfinder:grilling
status: closed
blockedBy: [chat-scroll-01-body-lock]
---

## Question
How should the overlay height track the visible viewport when keyboard opens: `h-[100dvh]` with `index.html:22` `interactive-widget=resizes-content` alone, JS `visualViewport.height/offsetTop` inline `style height/top` (`ChatThread.jsx:144-152,198,219` pre-fix), or hybrid `h-[100dvh]` + `h-[100vh]` fallback? Which keeps input pinned above keyboard and prevents page scroll bleed on iOS Safari (where `dvh` + `visualViewport` behave differently) and Android Chrome / PWA, without layout jank?

## Resolution
Decision: **A — `h-[100dvh]` only** with `index.html:22` `viewport-fit=cover interactive-widget=resizes-content`. Overlay is `fixed inset-0 h-[100dvh] overflow-hidden` (`ChatThread.jsx:165,198` after patch); no JS `vvHeight/vvOffsetTop` inline height/top. Android Chrome 108+ resizes layout viewport via `resizes-content` automatically; iOS fallback uses `visualViewport resize/scroll -> listRef.scrollTop=scrollHeight` only for keeping bottom visible (`ChatThread.jsx:143-160`), not for sizing. Hybrid not needed — `dvh` already covers modern iOS 15.4+/Android, `100vh` fallback would reintroduce address-bar jank. Ponytail: minimal, no JS layout thrash.
