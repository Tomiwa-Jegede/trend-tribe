---
label: wayfinder:grilling
status: closed
blockedBy: [chat-scroll-02-height-strategy]
---

## Question
How to keep latest message visible when keyboard opens without leaking scroll to page: `visualViewport resize/scroll` listener (`ChatThread.jsx:144-160` pre-fix and `ChatThread.jsx:143-160` post-fix) + `input onFocus scrollTop=scrollHeight` (`ChatThread.jsx:248`) vs `h-[100dvh]` auto-resize alone? When should we scroll `listRef` (only when `document.activeElement===inputRef`), with what timing (`requestAnimationFrame`), and how to avoid double-scroll jank when both `visualViewport` and `dvh` fire on iOS vs Android?

## Resolution
Decision: **Keep both — `visualViewport resize/scroll` + `onFocus rAF scroll` only if `activeElement===inputRef`** (`ChatThread.jsx:143-160` + `ChatThread.jsx:248`). `h-[100dvh]` + `interactive-widget` resizes container on Android, but iOS visualViewport offset still pans; rAF scrollTop=scrollHeight only when input focused prevents double-jank when both dvh and visualViewport fire. No extra `scrollIntoView` or body scroll — contained to `listRef` via `overscroll-contain` (`04`). Ponytail: one listener + one rAF, no polling.
