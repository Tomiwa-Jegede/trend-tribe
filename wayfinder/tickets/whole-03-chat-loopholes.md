# Ticket — Chat Loopholes (from chat flow map)

## Question
Chat had double delivery (`Socket+Pusher`), `contactViews` stripped by `stripAdminFields`, `POST /messages` blocking seller replies as own-listing, and `InboxPage` only showing threads after first message. Already fixed via `favoriteCount` absolute + `900ms` dedup, `contactViews` kept public, `recipientId` for replies, and pending `tt_saved_chats` → real `Conversation` table. Is there any remaining loophole — e.g., `GET /thread` should prefer `conversationId` over `listingId+otherId` for per-person merge?

Label: wayfinder:research
Status: open
