# Ticket — Inbox Split (Chat vs System)

## Question
Previously `InboxPage` mixed `Message` (chat) and `Notification` (system) — badge counts and `conversations` included admin broadcasts. Should chat be at `/chat` (per-seller `getConversations` where `listingId not null` and `role != ADMIN`) and inbox at `/inbox` (only `!listingId` system messages), with two independent `Navbar` badges (`inboxUnread` chat vs `NotificationBell` system) and push `tag: chat-*` vs `notif-*` deep-links?

Label: wayfinder:grilling
Status: closed
Resolution: Yes — chat /chat per-seller, inbox /inbox system only, two independent badges and push tags.
Blocks: 08-persistence
