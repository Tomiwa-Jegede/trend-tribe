# Wayfinder Map — Chat Flow Loopholes

## Destination
Chat flow is loophole-free and shippable: Contact Seller → per-listing chat room (buyer,seller,listing) → realtime (presence/typing/ticks) → persistence (saved, close collapses not deletes, 30d TTL) → push deep-link, with all decisions locked and spec ready to build. No open questions before execution.

## Notes
- Domain: Trend Tribe marketplace chat (Prisma/Postgres + Express + Socket.IO/Pusher + React/Tailwind)
- Skills every session should consult: `product-brainstorming` for framing, `ui-ux-pro-max` for chat UI, `ponytail` for minimal fix
- Stack: `Message {listingId, senderId, recipientId, read, deliveredAt}`, `Listing {sellerId}`, `User`, `realtime.js` presence/typing, `InboxPage`/`ChatThread`

## Decisions so far
- [Contact Seller Entry](tickets/01-contact-seller-entry.md): Sold → show `SOLD` overlay, block `contactViews` increment; self-contact blocked in both `ListingDetail` and `DiscoverFeed`; auth preserves `?thread=listing-seller` via `state.from` to land in chat after login; `contactViews` only on first `Send`, not on room open
- [Thread Identity](tickets/02-thread-identity.md): Thread = per-person merged `(buyer,seller)` not per-listing; empty room exists before first message (saved pending); store as real `Conversation` table `@@unique([buyerId, sellerId])` (migrate from virtual `thread-{listingId}-{otherId}` grouping); deleted/sold listing → show `Product no longer available` and block new sends
- [First-Contact Empty Room](tickets/03-first-contact-empty.md): Pending shows skeleton (pulse avatar + 2 lines) until `getListingById` resolves, then `Seller Name · Listing Title`; fallback to `listing.seller` when `withUser` is just `{id}`; list shows `Tap to open chat`, thread shows empty bubble area + product card on top
- [Send Path](tickets/04-send-path.md): Seller reply sends `recipientId: withUser.id`, backend allows `sellerId === me` when `recipientId` provided; optimistic UI keeps text until 201, shows `Failed to send — tap to retry`, disables while sending; dedup via absolute `favoriteCount`/`views` and 900ms key
- [Realtime Delivery](tickets/05-realtime-delivery.md): Favorite/view absolute `favoriteCount` from `count` + `900ms` dedup `view:{id}:{views}` for idempotent `+1`; `deliveredAt` on fetch + `socket delivered` + `presence.online` fallback for `✓✓` grey; `typing` ephemeral 800ms/2s, `presence` in-memory `onlineCounts`
- [Push When Foreground](tickets/06-push-foreground.md): Skip native push when `isOnline(recipientId)` true, rely on realtime + in-app; chat badge `Message where read=false && listingId not null && role != ADMIN`; deep-link `url: /chat?thread=listingId-senderId`
- [Inbox Split](tickets/07-inbox-split.md): Chat `/chat` = `getConversations` where `listingId not null && role != ADMIN` per-seller rooms; Inbox `/inbox` = `!listingId` system only; badges independent `GET /messages/unread-count` (chat) vs `GET /notifications/unread-count` (system), push `tag: chat-*` vs `notif-*`
- [Persistence](tickets/08-persistence.md): Close collapses not deletes, only Delete all / swipe-delete removes; migrate to real Conversation table now; TTL deletes all Message rows (chat+system) where createdAt <30d

## Not yet specified
- Rate limiting / spam prevention for Contact Seller and message send (how many per minute, what error)
- Blocking / reporting a chat participant (UX and data model)
- Message edit/delete and product-context after listing is sold/deleted (what seller/buyer sees)
- File/image sharing in chat (reuse Cloudinary or keep text-only for V1)
- Conversation cleanup beyond 30d TTL (manual Delete all vs auto, and saved pending chats)

## Out of scope
- Gig/Service booking chat (separate flow, different table)
- Admin moderation dashboard for chats (follow-up effort)
- End-to-end encryption (out of scope for campus marketplace V1)
