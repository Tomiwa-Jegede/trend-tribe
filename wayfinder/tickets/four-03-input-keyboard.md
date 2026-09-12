---
label: wayfinder:grilling
status: closed
---

## Question
`ChatThread.jsx:243` input `form p-3 border-t shrink-0 sticky bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]` is sibling of `listRef:225` inside same `fixed inset-0 h-[100dvh] flex flex-col` — it stays above keyboard via `h-[100dvh]` + `interactive-widget=resizes-content` + `visualViewport` scroll, but still part of page layer and can appear to scroll with `listRef` when `overscroll-contain` bounces. Should input be moved to keyboard's layer: `position:fixed bottom:0 left:0 right:0` + `env(keyboard-inset-height, 0)` or `navigator.virtualKeyboard` API (`overlaysContent` + `geometrychange`), or keep `shrink-0 sticky` but isolate `listRef` as sole scroller with `overscroll-behavior:contain`? Which anchors input to keyboard on iOS Safari / Android Chrome / PWA without covering `safe-area`?

## Resolution
Decision: **shrink-0 sticky bottom-0 inside fixed h[100dvh]** — keep `ChatThread.jsx:243` `shrink-0 sticky bottom-0` with `pb-[max(...env(safe-area))]`, overlay `fixed inset-0 h-[100dvh] flex flex-col` resizes with keyboard via `interactive-widget=resizes-content`; `listRef:225` `flex-1 min-h-0 overscroll-contain` is sole scroller. No `virtualKeyboard` or `position:fixed` to keyboard layer — ponytail: native resize contains without extra API, safe-area preserved.
