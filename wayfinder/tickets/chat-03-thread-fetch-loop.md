## Question
ChatThread does initial `Promise.all(getListingById + getThread)` then immediate `fetchThread()` via `useEffect([fetchThread])` — double fetch loop on every open. Should we keep single fetch path and dedup via `useRealtime` + `deliveredAt`?
