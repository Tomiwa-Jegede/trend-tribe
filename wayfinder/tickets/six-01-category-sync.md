---
label: wayfinder:grilling
status: closed
---
## Question
Sync `Browse by Category` ↔ `FilterBar` category filter via URL `?category=`/`?subcategory=` as source of truth, disabled in `Discover` (`sort=random`) mode — should picker deep-link to `/marketplace?category=` and pre-fill, should FilterBar change update URL and Browse state, and how to handle reset/back without loop?

## Resolution
URL truth: `?category=`/`?subcategory=`/`?page=` is single source. `Browse by Category` → `navigate(/marketplace?category=VALUE)`; `FilterBar` `onFilterChange` → `setSearchParams({category,subcategory,page:1}, replace:true)` with equality guard (`JSON.stringify(curr)===JSON.stringify(params)` return) to avoid `setSearchParams` loop (`MarketplacePage.jsx:180`). `Discover` (`?view=discover`) ignores category (stays `sort=random`). `FilterBar` state syncs from URL via `useEffect([searchParams])` on mount/back/forward. Implementation already in `MarketplacePage.jsx:180` + `HomePage Browse` deep-link — minimal, no extra state.
