---
label: wayfinder:grilling
status: closed
---
## Question
Should input bar be `position: fixed` with `bottom: 0` + `bottom: env(keyboard-inset-height,0)` and `left:0 right:0`, `position: sticky bottom-0` inside `flex flex-col`, or `position: absolute` inside `relative h-[100dvh]` — which keeps it locked above keyboard and never scrolls with messages?

## Resolution
`shrink-0` flex sibling at bottom of `flex flex-col h-[100dvh]` — not `fixed` (detaches from flex, needs JS inset) nor `absolute` (needs relative). List is `flex-1 min-h-0 overflow-y-auto`, input is outside scroll, so it never scrolls away; with `h-[100dvh]` + `interactive-widget=resizes-content` it stays above keyboard.
