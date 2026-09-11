---
label: wayfinder:grilling
status: closed
---
## Question
Should `localStorage jegede-bubble-pos` store raw drop position or snapped edge position, and should mount load of old center-saved pos auto-snap to nearest edge, while `drag={!open}` ensures no drag when chat open doesn't break snap?

## Resolution
Store snapped edge pos (`{x: snappedX, y: clampedY}`) — not raw; mount `useEffect` checks stored `x` not at edge (`0` or `-vw+80`) → snap to nearest edge and save. `drag={!open}` disables when chat open, snap not interfering with open animation.
