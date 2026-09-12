---
label: wayfinder:grilling
status: closed
---

## Question
`ChatThread.jsx:199` header (`px-4 py-3 border-b bg-gray-50` with Back + avatar + presence) is first child of `fixed inset-0 h-[100dvh] flex flex-col` but has no `shrink-0`/`sticky top-0`/`z-10`, so when `listRef:225` scrolls or keyboard `visualViewport` resizes, header can shift/bounce or be pushed. Should header be `shrink-0 sticky top-0 z-10 bg-gray-50` (or `fixed` top of overlay) with `safe-area-inset-top` padding, and product card `ChatThread.jsx:216` stay inside scroll or below header? Which keeps header pixel-fixed while `flex-1 min-h-0 overflow-y-auto overscroll-contain` list scrolls underneath on iOS/Android/PWA?

## Resolution
Decision: **shrink-0 sticky top-0 z-10** — header `ChatThread.jsx:199` gets `shrink-0 sticky top-0 z-10 bg-gray-50`, stays inside `fixed inset-0 h-[100dvh] flex flex-col` as first child, never moves with `listRef:225` scroll or `visualViewport` keyboard resize. Product card `ChatThread.jsx:216` stays `shrink-0` below header (outside scroll), list `flex-1 min-h-0 overscroll-contain` is sole scroller underneath.
