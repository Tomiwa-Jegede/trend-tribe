# In-app Chat (WhatsApp-style) — Trend Tribe Spec

**Status:** Ready for dev | **Stack:** Prisma/Postgres + Express 4 + Socket.IO + Pusher fallback + React 19 + Tailwind | **Date:** 2026-09-10

## 1. Goal
Replace `Contact Seller → wa.me` first-contact jump with a per-listing in-app chat room that feels like WhatsApp: real-time bubbles, presence, typing, ticks, push deep-link.

## 2. UX Rules (WhatsApp parity, 6 points)
1. **Entry:** `Contact Seller` on `ListingDetail` / `DiscoverFeed` → `POST /messages {listingId}` → opens or creates `1:1` room `(buyerId, sellerId, listingId)` if none. Same UX for seller reply.
2. **Inbox:** `GET /messages/conversations` → one list for **every user** (buyer *and* seller same `User` row, `role` ignored). Each row: `otherUser {avatar, fullName}`, `listing {title, images[0], price}`, `lastMessage {body, createdAt}`, `unreadCount`, sorted `lastMessageAt desc` — WhatsApp main list. No separate seller inbox.
3. **Thread:** `GET /messages/thread?listingId&with=otherId` → 100 asc, product card header on top (image/title/price) + bubbles.
4. **Realtime:** Socket.IO rooms `user:{id}` + Pusher `user-{id}` fallback:
   - `message` → new bubble
   - `typing:start/stop` (ephemeral, 800ms debounce, 2s auto-clear)
   - `presence` → `● Online / Last seen HH:mm`
   - `message:delivered` → `✓✓` grey, `message:read` → `✓✓` blue
5. **Unread badge:** `GET /messages/unread-count` → `Navbar` badge + per-thread `unreadCount`. Clears on `PATCH /messages/:id/read` or `socket message:read` when thread opened.
6. **Push:** `POST /messages` → `sendPushToUser(recipientId, {title:"Trend Tribe — New chat message", body:"${sender}: ${preview}", url:"/messages?thread=${listingId}-${senderId}", tag:"chat-${id}", badgeCount})` → tap deep-links to that thread, not just `/messages`.

**Decision locked:** Thread key = `(buyer, seller, listingId)` — not `(buyer,seller)` alone. Prevents sold-item clutter. `listingId` nullable for admin broadcasts.

## 3. Data Model (Prisma)

**Option A — Keep current (implemented, `71e3db5`):**
```prisma
model Message {
  id          Int      @id @default(autoincrement())
  subject     String?
  body        String
  senderId    Int
  recipientId Int
  listingId   Int?      // per-listing thread; null = admin
  read        Boolean   @default(false)
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  sender      User      @relation("SentMessages", fields:[senderId], references:[id], onDelete:Cascade)
  recipient   User      @relation("ReceivedMessages", fields:[recipientId], references:[id], onDelete:Cascade)
  listing     Listing?  @relation(fields:[listingId], references:[id], onDelete:SetNull)
  @@index([recipientId, read])
  @@index([recipientId, createdAt])
  @@index([listingId])
}
```
Conversations grouped in-memory by `thread-${listingId}-${otherId}` (`message.controller.js: getConversations`).

**Option B — Explicit Conversation (if you want pagination per room):**
```prisma
model Conversation {
  id            String   @id @default(cuid())
  listingId     Int?
  buyerId       Int
  sellerId      Int
  lastMessageAt DateTime @updatedAt
  listing       Listing? @relation(fields:[listingId], references:[id], onDelete:SetNull)
  buyer         User     @relation("ConvBuyer", fields:[buyerId], references:[id])
  seller        User     @relation("ConvSeller", fields:[sellerId], references:[id])
  messages      Message[]
  @@unique([listingId, buyerId, sellerId])
  @@index([buyerId, sellerId])
}
model Message { conversationId String?; conversation Conversation? @relation(fields:[conversationId], references:[id]) }
```
Migrate only if `getConversations` scan (200 rows) becomes slow — YAGNI until 10k msgs/day.

## 4. API
- `POST /messages {listingId, body}` → create, `contactViews++`, `emitMessage`, `sendPush` (already `src/controllers/message.controller.js:6`)
- `GET /messages` → `OR(sender,recipient)` (buyer sees his sent, `src/controllers/message.controller.js:52`)
- `GET /messages/conversations` → grouped `thread-${listingId}-${otherId}` with `lastMessage, unreadCount` (new)
- `GET /messages/thread?listingId&with=` → 100 asc, marks `deliveredAt` (new)
- `POST /messages/:id/delivered`, `PATCH /messages/:id/read`, `GET /messages/presence?ids=` (new)
- `DELETE /messages` bulk ops unchanged

## 5. Realtime (`src/realtime.js`)
- `onlineCounts Map<userId, count>` + `lastSeen Map` → `io.emit("presence")` on connect/disconnect + `pusher emitPresence`
- `socket.on("typing:start/stop")` → `io.to(user:${to}).emit("typing")` + `pusher emitTyping` (no DB)
- `socket.on("message:delivered")` / `message:read` → `prisma.message.update` → `emitDelivered/emitRead` to sender

## 6. Frontend
- `src/services/messageService.js` → `sendMessage, getThread, getConversations, getPresence, markDelivered`
- `src/components/chat/ChatThread.jsx` → product header + bubbles + `typing...` + `● Online` + `✓/✓✓` ticks + `socket.emit typing`
- `src/pages/InboxPage.jsx` → `Chat rooms — per seller` grid (from `getConversations`), `?thread=listingId-otherId` auto-opens thread, `useRealtime("message","typing","presence","message:delivered")`
- `src/pages/ListingDetail.jsx` / `DiscoverFeed.jsx` → `Contact Seller` → `POST /messages` → `navigate("/messages?thread=...")` (no `wa.me`)

## 7. Acceptance
- Buyer taps `Contact Seller` on sold/unsold listing → lands in room with product card, can chat instantly, seller gets push even if PWA closed, tapping push lands in same room.
- Two browsers (buyer/seller) see typing, online, ticks without refresh or Pusher key (Socket fallback).
- Inbox shows same list whether you were buyer or seller; unread clears on open.

## 8. Not in V1
Image in chat, voice, reply-to, delete-for-everyone — add when `contacts per listing > 10%` proves chat retains sellers.
