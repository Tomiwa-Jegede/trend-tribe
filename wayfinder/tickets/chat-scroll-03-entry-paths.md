---
label: wayfinder:grilling
status: closed
---

## Question
`InboxPage.jsx` has two thread entry paths: URL `?thread=listingId-otherId` early-return (`InboxPage.jsx:304-315`) vs `expanded` state inline (`InboxPage.jsx:310-314,356-368`) inside `finalConvos` IIFE, while `App.jsx:122-127,304` hides `Navbar`/`Footer` only for `?thread` URL, not `expanded`. Does this dual path leak scroll (background list still mounted, Navbar/Footer behind overlay, `container-app` still scrollable when keyboard opens via `expanded`)? Should we unify to single `?thread` URL truth, drop `expanded`, or keep both with consistent overlay isolation?

## Resolution
Decision: **Single URL truth** — thread open is always `?thread=listingId-otherId` (`InboxPage.jsx:303` early-return is canonical). Drop `expanded` inline path (`InboxPage.jsx:310,356` + IIFE) and drive open/close solely via `searchParams.set thread` / `handleCloseChat` delete. `App.jsx:122-127,304` already hides `Navbar`/`Footer` on `?thread` — after unify no background `container-app`/footer remains mounted behind `fixed h-[100dvh]` overlay, so keyboard open cannot leak scroll. Ponytail: one path, no duplicate state; `setExpanded` becomes derived from URL if kept for legacy, otherwise removed.
