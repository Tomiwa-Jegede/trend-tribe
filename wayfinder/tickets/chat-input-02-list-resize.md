---
label: wayfinder:grilling
status: closed
---
## Question
How should message list resize when keyboard opens — `flex-1 min-h-0 overflow-y-auto` inside `h-[100dvh]` parent (CSS only), or JS `height = visualViewport.height - header - input` — which keeps latest message visible and scrollable without input jumping below keyboard?

## Resolution
List `flex-1 min-h-0 overflow-y-auto overscroll-contain` inside `h-[100dvh]` parent — no JS `height = visualViewport.height - header - input`. Latest stays via `scrollTop = scrollHeight` on `visualViewport resize` + `onFocus`.
