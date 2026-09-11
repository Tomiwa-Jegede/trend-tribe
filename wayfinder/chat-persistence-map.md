# Wayfinder Map — Chat Persistence Across Devices

## Destination
Contacting a seller creates a durable chat that survives logout/login on another device — pending (no message yet) and active threads appear via DB, not just localStorage, with no ghost or duplicate.

## Notes
- Domain: `InboxPage` `tt_saved_chats` localStorage vs `Conversation` DB, `DiscoverFeed` Contact Seller, `message.controller` + `Conversation` upsert
- Skills every session should consult: `ui-ux-pro-max`, `ponytail`
- Stack: `Conversation @@unique([buyerId,sellerId])` + `listingId`, `Message`, `localStorage`

## Decisions so far
- [chat-persist-01-pending-db](tickets/chat-persist-01-pending-db.md): Dual persist local + POST /messages/conversations so new device sees pending via DB.
- [chat-persist-02-logout-device](tickets/chat-persist-02-logout-device.md): Conversations endpoint is source of truth; localStorage per-device, DB shared.

## Not yet specified
<!-- all tickets closed — way clear -->

## Out of scope
- Message soft-delete (separate)
- PWA badge
