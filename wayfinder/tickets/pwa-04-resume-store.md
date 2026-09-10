## Question
`DISCOVER_SCROLL_KEY` uses `sessionStorage` per tab; PWA standalone and browser tab have separate stores, so resume index diverges. Should resume be in `localStorage`, URL param, or keep `sessionStorage` but broadcast via `BroadcastChannel` so PWA and browser stay on same position?
