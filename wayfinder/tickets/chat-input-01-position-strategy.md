---
label: wayfinder:grilling
status: closed
---
## Question
Should pinned input use `position: fixed` with `bottom: 0` + `visualViewport`/`env(keyboard-inset)` calculation, `position: sticky bottom-0` inside `flex flex-col h-[100dvh]`, or JS setting `height = visualViewport.height` on container — which keeps input locked above keyboard without scrolling with page?

## Resolution
Use `sticky bottom-0` inside `flex flex-col h-[100dvh]` with `interactive-widget=resizes-content` — not `fixed` + `env(keyboard-inset)` JS calc. Sticky keeps input locked above keyboard while list scrolls underneath, no page scroll. Fallback `visualViewport` handler only for iOS where sticky fails.
