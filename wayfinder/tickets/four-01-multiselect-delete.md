---
label: wayfinder:grilling
status: closed
---

## Question
`InboxPage.jsx` Chats tab currently has `Select`/`Delete all` that operate on `messages` (Inbox system, `handleDeleteSelected`/`handleDeleteAll` `deleteMessagesBulk` + `selected Set`), but conversation rows (`finalConvos.map` `InboxPage.jsx:358-380` `PendingChatRow` + chat card `card p-4` `onClick openThread`) have no checkbox, no `selectedConvos Set`, no `Delete selected` for threads. Should Chats get its own Select mode: checkbox on each row (`FiSquare`/`FiCheckSquare` like Inbox), `selectedConvos` Set, `Delete selected` calls new `DELETE /messages/conversations` bulk (or `DELETE /messages` with `conversationId`), keeps `Delete all` separate, and what happens after delete (remove from `conversations`+`savedChats`+`tt_saved_chats` + tombstone to avoid poll resurrect)?

## Resolution
Decision: **As described** — Chats gets Select mode with `FiSquare`/`FiCheckSquare` checkbox on each row (`finalConvos` `PendingChatRow` + card), `selectedConvos Set<string>` state separate from Inbox `selected`, header shows `Delete selected (N)` + `Cancel` when selecting, `Delete all` stays separate. `Delete selected` calls bulk `DELETE /api/messages/conversations` `{keys}` (or `deleteMessagesBulk` with conversation keys), optimistically removes from `conversations` + `savedChats` + `localStorage tt_saved_chats`, tombstone 10s to avoid 5s poll resurrect, confirm `Delete N chats?`.
