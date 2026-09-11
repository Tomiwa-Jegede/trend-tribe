---
label: wayfinder:grilling
status: closed
---
## Question
How to constrain drag within visible frame so widget never leaves screen — manual `clamp(x, -vw+80, 0)` / `clamp(y, -vh+80, 0)` vs `dragConstraints` with ref bounding box vs `dragElastic` 0.15, and how to handle `window` resize/rotation, `safe-area-inset`, and `open` hidden state?

## Resolution
Manual `clamp(x, -vw+80, 0)` / `clamp(y, -vh+80, 0)` (80 = bubble 56 + 24 margin) — not `dragConstraints` ref (needs extra div, breaks `fixed`). `dragElastic 0.15` keeps feel. Resize/rotate handled via `window resize` listener re-clamping + re-snapping; `safe-area` via `80` margin suffices.
