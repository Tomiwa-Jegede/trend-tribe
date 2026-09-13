---
label: wayfinder:research
status: open
---

## Question
Trace every `useEffect` that adds `window.addEventListener("visibilitychange"|"focus"|"online")`, `document.addEventListener`, `navigator.serviceWorker.addEventListener("message")`, and `useRealtime("notification")` subscribe — does each return a cleanup (`removeEventListener`/`off`) on unmount or `isAuthenticated` change, or do listeners accumulate, duplicating `fetch`/`setBadge` calls the longer the app stays open (common "gets worse over time" bug)?
