---
label: wayfinder:grilling
status: closed
---
## Question
How does cached placeholder behave across PWA standalone vs browser tab — does `localStorage` share instantly, does Workbox `NetworkFirst` for `/api/stats` interfere, and what happens on first PWA install with no cache (SW not yet populated)?

## Resolution
`localStorage` is same origin for browser and PWA standalone → shared instantly. Set Workbox for `/api/stats` to `NetworkOnly` (or no cache) so SW doesn't serve 30s stale that masks `localStorage` placeholder; `localStorage` already handles offline. First PWA install no cache → dash `—` then fetch, same as browser.
