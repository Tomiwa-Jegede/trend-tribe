---
label: wayfinder:grilling
status: closed
---
## Question
How should the placeholder look when showing cached stale numbers — plain numbers, subtle “updating…” indicator, skeleton vs cached, and what to show on first visit with no cache (still blank vs 0 vs dash) without flicker when fresh arrives?

## Resolution
Show cached numbers instantly as plain numbers at 0.85 opacity + tiny pulsing dot, no skeleton. First visit no cache → dash `—` (not 0, not blank). Fresh fetch replaces with fade (no flicker) via `isStale` flag; if `updatedAt` missing, treat as stale.
