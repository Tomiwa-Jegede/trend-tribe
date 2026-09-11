---
label: wayfinder:grilling
status: closed
---
## Question
How to make input move up with keyboard and return on close — `viewport-fit=cover interactive-widget=resizes-content` + `h-[100dvh]` auto-resize vs JS `visualViewport.height` vs `window.innerHeight` vs `env(keyboard-inset-height)` for `bottom`?

## Resolution
`viewport-fit=cover, interactive-widget=resizes-content` + `h-[100dvh]` on overlay auto-resizes with keyboard (no JS `height` calc, no `env(keyboard-inset)`). JS `visualViewport` only for `scrollTop = scrollHeight` on `resize`/`onFocus` to keep latest visible — ponytail, CSS does work.
