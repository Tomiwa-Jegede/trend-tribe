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
- [frederick-v2-03-constrain-bounds](tickets/frederick-v2-03-constrain-bounds.md): Manual clamp `-vw+80,0` / `-vh+80,0`, `resize` re-clamp, no `dragConstraints`.
- [frederick-v2-04-persist-vs-snap](tickets/frederick-v2-04-persist-vs-snap.md): Store snapped pos, mount snap old center, `drag={!open}`.

## Not yet specified
<!-- all tickets closed — way clear, ready to build (already shipped a4bc779+d8c0f58) -->

## Out of scope
- Chat input fixed (separate map)
- Auto-hide after idle
