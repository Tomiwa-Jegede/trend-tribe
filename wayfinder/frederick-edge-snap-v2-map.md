# Wayfinder Map — Frederick Snap to Nearest Edge (Constrained Drag)

## Destination
Frederick bubble is draggable anywhere within visible frame (never outside), but on drag release always animates smoothly to nearest edge (left or right) — never stays in center — without breaking existing drag, idle, open/close, or persisted position.

## Notes
- Domain: `FrederickWidget.jsx` drag
- Skills every session should consult: `ui-ux-pro-max` for drag/edge snap UX, `ponytail` for minimal fix
- Stack: React 19 + `framer-motion` `drag` + `localStorage jegede-bubble-pos`, viewport clamp, spring snap

## Decisions so far
- [frederick-v2-01-measure-edge](tickets/frederick-v2-01-measure-edge.md): Pointer `info.point.x < vw/2` → nearest edge.
- [frederick-v2-02-animate-snap](tickets/frederick-v2-02-animate-snap.md): Spring 400/30 via `animate`, re-grab interrupts, keep `dragElastic 0.15`.

## Not yet specified
- How to animate snap — spring params, duration, and interrupt if user re-grabs mid-snap
- How to constrain drag — `dragConstraints` ref vs manual `clamp` vs `dragElastic` + bounds, and handling safe-area/insets
- How persisted pos interacts with snap — store raw drop vs snapped, and mount snap for old center saves
- Interaction with open/close and idle opacity — drag disabled when open, snap not interfering with open animation

## Out of scope
- Chat input fixed (separate map)
- Auto-hide after idle
