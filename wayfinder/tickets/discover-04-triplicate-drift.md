## Question
DiscoverFeed triplicates `[...listings, ...listings, ...listings]` and logs `[wraparound]` to console on every boundary, plus measures `clientHeight` which drifts on PWA `window-controls-overlay`. Should geometry use `ResizeObserver` + `getBoundingClientRect`, remove debug log, and keep server `sort=random` only?
