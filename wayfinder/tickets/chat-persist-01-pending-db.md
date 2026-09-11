---
label: wayfinder:grilling
status: closed
---
## Question
Should `InboxPage` persist pending `thread-{lid}-{withId}` only in `localStorage tt_saved_chats` or also `POST /messages/conversations` to create real `Conversation` row so new device sees it via `GET /messages/conversations`?

## Resolution
Persist pending to DB as well as localStorage: `InboxPage` now `POST /messages/conversations` on thread param, so `GET /messages/conversations` returns it on new device. Local fast, DB durable.
