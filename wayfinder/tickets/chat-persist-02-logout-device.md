---
label: wayfinder:grilling
status: closed
---
## Question
When user logs out then logs in same account on another device, should `tt_saved_chats` be cleared per-device or synced, and should `GET /messages/conversations` be sole source of truth for pending threads (so new device shows same chats)?

## Resolution
`GET /messages/conversations` is source of truth; `tt_saved_chats` stays per-device cache. New device fetches DB conversations, pending now durable, so same account sees same chats.
