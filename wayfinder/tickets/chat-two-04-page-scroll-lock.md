---
label: wayfinder:grilling
status: closed
---
## Question
How to prevent page scroll from moving input — `fixed inset-0` overlay with `overflow-hidden` on container vs `body { overflow: hidden }` when thread open vs `overscroll-behavior: contain` on list — which keeps input fixed while messages scroll?

## Resolution
`fixed inset-0 h-[100dvh]` overlay with `overflow-hidden` on container + list `overscroll-contain`, no `body` lock. Input `shrink-0` outside scroll never moves with page; list `flex-1 overflow-y-auto` scrolls independently inside overlay.
