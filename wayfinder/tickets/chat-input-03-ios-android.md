---
label: wayfinder:grilling
status: closed
---
## Question
How to handle iOS vs Android keyboard differences — `interactive-widget=resizes-content` support, `env(safe-area-inset-bottom)` + `env(keyboard-inset-height)`, and `visualViewport` vs `window.innerHeight` — which combo pins input reliably on both?

## Resolution
Keep `viewport-fit=cover, interactive-widget=resizes-content` + `pb-[env(safe-area-inset-bottom)]`; use `window.visualViewport?.height || window.innerHeight` check — iOS needs `visualViewport`, Android `resizes-content` suffices.
