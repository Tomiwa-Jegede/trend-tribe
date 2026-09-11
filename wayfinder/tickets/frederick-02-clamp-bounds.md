---
label: wayfinder:grilling
status: closed
---
## Question
How to clamp drag so bubble never leaves viewport — `dragConstraints` with `ref` vs manual `clamp(x, -vw+80, 0)` vs `Math.max/min` on `info.offset` — and should it handle window resize/rotation and safe-area insets?

## Resolution
Manual `clamp(x, -vw+80, 0)` on `info.offset` + `window resize` listener to re-clamp — not `dragConstraints` ref, handles rotation/safe-area.
