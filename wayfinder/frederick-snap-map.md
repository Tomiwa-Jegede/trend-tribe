# Wayfinder Map — Frederick Widget Snap to Edge

## Destination
Frederick/Jegede bubble is draggable but on release always snaps to nearest edge (left or right) — never stays in center or floats freely — and drag is clamped so widget never leaves viewport.

## Notes
- Domain: `FrederickWidget.jsx` bubble drag
- Skills every session should consult: `ui-ux-pro-max` for drag UX, `ponytail` for minimal fix
- Stack: React 19 + `framer-motion` `drag`, `localStorage` pos, viewport clamp

## Decisions so far
- [frederick-01-snap-threshold](tickets/frederick-01-snap-threshold.md): Spring stiffness 400 to nearest edge via vw/2.
- [frederick-02-clamp-bounds](tickets/frederick-02-clamp-bounds.md): Manual clamp -vw+80,0 + resize listener.
- [frederick-03-persist-snap](tickets/frederick-03-persist-snap.md): Store snapped pos, drag disabled when open.

## Not yet specified
<!-- all tickets closed — way clear -->

## Out of scope
- Chat input fixed (separate map)
- Auto-hide or idle opacity
