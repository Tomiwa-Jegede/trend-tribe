# frontend-04-pwa-loops — CLOSED

## Question
Are PWA/install find-loops bounded? Check `usePWAInstall.js`, `PWARegister.jsx:75`, `pwa.controller.js` `pwa-find-loop` map, and `InboxPage.jsx` chat find loops vs recent `Navbar.jsx:73` wallet fix.

## Type
wayfinder:research


## Resolution
Research PWARegister 60m SW update + 30s badge +5m keepalive all visible-only bounded; usePWAInstall single deferred prompt; pwa.controller 10m dedup admin-excluded — no unbounded loops. Saved locally.
