## Question
Triplicate `loopItems = [...listings, ...listings, ...listings]` measures `container.clientHeight` for wraparound. PWA standalone with `window-controls-overlay` reports different `clientHeight` than browser tab, causing jump miscalc and stutter. Should measurement use `window.innerHeight`, resize observer, or CSS `100dvh` locked height to keep geometry identical?
