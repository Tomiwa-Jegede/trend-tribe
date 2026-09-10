# Ticket — Persistence (save, close, TTL)

## Question
Chat should be saved so `Close` collapses not deletes — currently uses `localStorage tt_saved_chats` for pending first-contact rooms. Should we persist pending to DB as empty `Conversation` or keep localStorage, and should `handleDeleteAll` clear both `messages` and `savedChats`? And should all `Message` rows auto-delete after `30d` via `prisma.message.deleteMany where createdAt < 30d` daily, keeping `Not yet specified` rate-limit/block/report out of scope for V1?

Label: wayfinder:grilling
Status: closed
Resolution: Close collapses only, only Delete all/swipe deletes; migrate to real Conversation table now; TTL deletes all Message rows (chat+system) where createdAt <30d.

