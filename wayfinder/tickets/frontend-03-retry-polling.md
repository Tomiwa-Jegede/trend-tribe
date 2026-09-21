# frontend-03-retry-polling

## Question
Are retry/polling loops bounded? Check `useRealtimePolling.js` fallback, `Navbar.jsx:189` requestIdleCallback defer, `GigWalletPage.jsx:143` focus/visibility + `useRealtime("notification")` double-fetch dedup, and `axios.js` retry on 401 with `x-new-token`.

## Type
wayfinder:research
