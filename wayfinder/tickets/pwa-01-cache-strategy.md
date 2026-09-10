## Question
Workbox `runtimeCaching` for Discover `GET /listings?sort=random`: should it be `NetworkOnly` (no stale) vs `NetworkFirst` with 30s TTL, and does the first-match rule (`/api/listings` NetworkOnly vs `/api/*` NetworkFirst) actually keep PWA and browser on the same fresh shuffle, including invalidation for old SW installs?
