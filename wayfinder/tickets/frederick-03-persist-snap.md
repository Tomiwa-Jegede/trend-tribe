---
label: wayfinder:grilling
status: closed
---
## Question
Should persisted `localStorage jegede-bubble-pos` store raw drag offset or snapped edge pos, and should drag be disabled when chat `open` (bubble hidden) vs always draggable?

## Resolution
Store snapped edge pos (`{x: snappedX, y: clampedY}`) in `localStorage jegede-bubble-pos`, not raw offset; `drag={!open}` disabled when chat open (bubble hidden).
