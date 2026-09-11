---
label: wayfinder:grilling
status: closed
---
## Question
When does a badge clear — on hamburger open, on navigating to that section, on marking read, or on `message:read` realtime event? If clearing is optimistic, how to avoid poll resurrecting stale count (tombstone vs refetch)?

## Resolution
Clear on `message:read` / `PATCH /messages/:id/read` / `read-all` realtime event, not on hamburger open. Poll 5s keeps `pendingDeletesRef` tombstone for 10s to avoid resurrecting stale `unreadCount`; `fetchMessages` filters tombstones.
