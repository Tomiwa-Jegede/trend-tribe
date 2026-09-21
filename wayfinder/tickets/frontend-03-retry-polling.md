# frontend-03-retry-polling — CLOSED

## Question
Are retry/polling loops bounded? Check `useRealtimePolling.js` fallback, `Navbar.jsx:189` requestIdleCallback defer, `GigWalletPage.jsx:143` focus/visibility + `useRealtime("notification")` double-fetch dedup, and `axios.js` retry on 401 with `x-new-token`.

## Type
wayfinder:research


## Resolution
Research useRealtime 300/1000ms dedup Map + polling 10s focus/vis; axios 401 selective clear no retry loop; Navbar requestIdleCallback 800ms defer keeps 60fps; GigWallet double fetch needs throttle. Saved locally.
