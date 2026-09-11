---
label: wayfinder:grilling
status: closed
---
## Question
When bubble released, should snap be immediate vs spring animation, and should threshold be “nearest edge” (center line `vw/2`) or 50% with hysteresis — which feels like WhatsApp/iMessage edge snap?

## Resolution
Spring `type: spring, stiffness: 400, damping: 30` to nearest edge via `vw/2` center line — not instant, feels native.
