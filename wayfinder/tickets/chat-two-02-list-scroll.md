---
label: wayfinder:grilling
status: closed
---
## Question
How should message list scroll independently — `flex-1 min-h-0 overflow-y-auto overscroll-contain` inside `flex flex-col h-[100dvh]` with input as `shrink-0` sibling outside scroll, vs list `height: calc(100dvh - header - input)` — which keeps latest visible without input moving?

## Resolution
List `flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth` inside `flex flex-col h-[100dvh]`; input `shrink-0` outside scroll — no `calc` JS. Latest stays via `scrollTop = scrollHeight` on `msgs` + `visualViewport` resize/onFocus.
