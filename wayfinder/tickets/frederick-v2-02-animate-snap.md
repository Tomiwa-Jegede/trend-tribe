---
label: wayfinder:grilling
status: closed
---
## Question
How to animate snap smoothly to edge — `spring` `stiffness/damping` vs `tween` duration, should `animate={{x}}` spring interrupt if user re-grabs mid-snap, and should `dragElastic` be 0 during snap to avoid bounce?

## Resolution
`animate={{x: pos.x, y: pos.y}}` with `transition={{x:{type:"spring",stiffness:400,damping:30}, y:{type:"spring",stiffness:400,damping:30}}}` — spring interrupts on re-grab (Framer `drag` takes over). Keep `dragElastic 0.15` for drag feel, not 0.
