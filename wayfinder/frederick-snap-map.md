# Wayfinder Map — Frederick Widget Snap to Edge

## Destination
Frederick/Jegede bubble is draggable but on release always snaps to nearest edge (left or right) — never stays in center or floats freely — and drag is clamped so widget never leaves viewport.

## Notes
- Domain: `FrederickWidget.jsx` bubble drag
- Skills every session should consult: `ui-ux-pro-max` for drag UX, `ponytail` for minimal fix
- Stack: React 19 + `framer-motion` `drag`, `localStorage` pos, viewport clamp

## Decisions so far

## Not yet specified
- Snap animation (spring vs instant) and threshold (nearest edge vs 50% center line)
- Clamp bounds — full viewport minus bubble size + safe margin, handling resize/rotation
- Persisted pos vs reset on snap (should stored pos be snapped pos)
- Interaction with `open` state (drag disabled when chat open)

## Out of scope
- Chat input fixed (separate map)
- Auto-hide or idle opacity
