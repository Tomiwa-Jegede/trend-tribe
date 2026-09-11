---
label: wayfinder:grilling
status: closed
---
## Question
Chat input pinned above keyboard on mobile (PWA + browser, iOS/Android) — `fixed inset-0 h-[100dvh]` with `interactive-widget=resizes-content` + `safe-area-inset`, `visualViewport` resize keeps list at latest message — should input be `sticky bottom-0` inside flex vs fixed, and how to handle `dvh` + `ResizeObserver` without stutter?

## Resolution
`index.html:22` `viewport-fit=cover, interactive-widget=resizes-content`; Inbox overlay `fixed inset-0 h-[100dvh]` + `ChatThread` `h-full flex-1 min-h-0` inside `flex flex-col`; list `flex-1 min-h-0 overflow-y-auto overscroll-contain`, input `shrink-0 sticky bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]`, `inputRef` + `visualViewport resize/scroll` + `onFocus` scroll to bottom — already shipped `7b64280`, WhatsApp/iMessage behavior, no stutter.
