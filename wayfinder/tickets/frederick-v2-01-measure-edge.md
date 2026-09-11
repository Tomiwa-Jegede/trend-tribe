---
label: wayfinder:grilling
status: closed
---
## Question
How to measure nearest edge on release — distance from bubble center to left edge vs right edge, vs pointer `info.point.x`, vs `info.offset.x` + `pos.x`, and threshold `vw/2` vs bubble mid vs 50% with hysteresis — which gives intuitive snap without flicker when dropped near center?

## Resolution
Use pointer `info.point.x < vw/2` → nearest edge (left if pointer left of center, right otherwise). Ponytail: no bubble-center calc, no hysteresis — pointer is what user dropped, intuitive, no flicker at `vw/2`.
