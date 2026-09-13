# Research — What getThread and getConversations actually return (issue #26)

Date: 2026-09-13 | Branch: `research/chatthread-other-user-derivation` | Wayfinder Map #25

## TL;DR

- `GET /messages/thread` (`getThread:167`) includes **only `sender {id, username, fullName}` — no `recipient`, no `avatar`** (`message.controller.js:222`). Deriving the "other user" header from `msgs[].sender` alone is lossy; every reply where `senderId === me` would fall back to `product.seller` guess.
- `GET /messages/conversations` (`getConversations:291`) returns **`otherUser {id, username, fullName, avatar, role}`** (`message.controller.js:298-299` + `319-320` legacy). It is the only endpoint today that has avatar.
- `withUser` as passed from `InboxPage.jsx:367` is **always bare `{id}`** — `InboxPage.jsx:364-368` parses `?thread=listingId-otherId` and calls `ChatThread listingId={lid} withUser={{id: withId}}`. No name/avatar is carried in the prop.
- **Backend change required for ticket 28**: extend `getThread` to `include: { sender + recipient }` each `select: {id, username, fullName, avatar}` (and ideally `role` for admin filtering). No frontend-only fix can reliably show avatar on first load without it. Risk: tiny (adds 1 join + ~200 bytes/message, no schema migration, read-only select).

---

## 1. `getThread` — current contract

**File:** `backend/src/controllers/message.controller.js:167-239`

```js
// 222 — the factual line cited in the ticket
const messages = await prisma.message.findMany({
  where: whereWithVisibility,
  orderBy: { createdAt: "asc" },
  take: 100,
  include: { sender: { select: { id: true, username: true, fullName: true } } }
});
return res.status(200).json({ messages });
```

- Includes `sender` only; selects `id, username, fullName` — **no `avatar`, no `recipient`** verified by reading line 222 verbatim.
- Compare other endpoints in same file:
  - `createMessage:43` same shape: `include: { sender: { select: {id, username, fullName} }, listing: {id, title} }` — no recipient/avatar either, but the returned `msg` is emitted via `emitMessage(recipientId, msg:57)` so realtime pushes have same limited sender.
  - `getMyMessages:99-103` includes **both** sides but still sans-avatar: `sender {id, username, fullName, role}`, `recipient {id, username, fullName}` — avatar missing even there.
  - `getConversations:298-302` *does* include avatar (see §2).

**Frontend consumer:** `frontend/src/services/messageService.js:39-42`

```js
export const getThread = async (listingId, withId) => {
  const { data } = await api.get("/messages/thread", { params: { listingId, with: withId } });
  return data.messages;
};
```

Returns bare `messages[]` array — no wrapping `otherUser`. `ChatThread.jsx:30` does `setMsgs(data || [])`.

**Actual JSON shape today (inferred from code, no fixture exists — grepped `tests/` and repo for sample JSON: none):**

```json
{ "messages": [ { "id": 1, "body": "...", "senderId": 2, "recipientId": 5, "listingId": 50, "createdAt": "...", "sender": { "id": 2, "username": "alice", "fullName": "Alice A" } } ] }
```

No `recipient` object, no `avatar` on `sender`.

## 2. `getConversations` — the only avatar source

**File:** `backend/src/controllers/message.controller.js:291-347` (`getConversations:291`)

```js
// 293-302 — per-person Conversation (buyer,seller) path
include: {
  buyer:  { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
  seller: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
  listing: { select: { id: true, slug: true, title: true, images: true, price: true } },
  messages: { orderBy: { createdAt: "desc" }, take: 1 },
}
// 306-311 — derived otherUser
const otherUser = c.buyerId === req.user.id ? c.seller : c.buyer;
return { key, id: c.id, listing: c.listing, otherUser, lastMessage, unreadCount, updatedAt: c.lastMessageAt, buyerId, sellerId };

// 314-322 — legacy per-listing path (messages without conversationId)
include: {
  sender:    { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
  recipient: { select: { id: true, username: true, fullName: true, avatar: true, role: true } },
  listing: ...
}
```

- Returns `conversations[]` where each has `otherUser {id, username, fullName, avatar, role}` — factual, verified at lines 298-299 and 319-320.
- `otherUser` selection is authoritative because it joins `Conversation.buyer/seller` (or legacy `Message.sender/recipient`) with `avatar` selected.
- **But** `ChatThread` today does *not* consume this — `InboxPage.jsx:88` fetches `[getMyMessages, getConversations]` but `ChatThread.jsx:11` receives only `withUser={{id}}` and derives `displayUser` from `product.seller` (see §3). A conversations-aware header would require either (a) passing `otherUser` through, or (b) extending `getThread` so the thread itself is self-sufficient (preferred per prompt: "messages only vs messages+conversations").

## 3. `withUser` — always bare `{id}`

**File:** `frontend/src/pages/InboxPage.jsx:364-368`

```js
const threadParamDirect = searchParams.get("thread");
if (isChat && threadParamDirect) {
  const [lid, withId] = threadParamDirect.split("-").map((v) => parseInt(v, 10));
  if (!isNaN(lid) && !isNaN(withId)) {
    return <ChatThread listingId={lid} withUser={{ id: withId }} onClose={handleCloseChat} />;
  }
}
```

- `withUser` is constructed from URL `?thread=listingId-otherId` only — no `fullName/username/avatar` ever carried. Same in pending-chat path `PendingChatRow:44` where name is derived from `getListingById(listingId).seller` (another `product.seller` guess).
- `ChatThread.jsx:11` prop `withUser` therefore enters header derivation with just `id`.

**File:** `frontend/src/components/chat/ChatThread.jsx:227`

```js
const displayUser = withUser?.fullName || withUser?.username ? withUser : product?.seller || withUser;
```

Current fallback chain: if `withUser` has name → use it (never true today), else `product.seller` (listing fetch `getListingById(listingId):26-28`), else bare `withUser` (renders `?`/initial fallback `displayUser?.fullName?.[0] || ?` at line 272). This is the **seller-guess** the wayfinder seeks to eliminate. For inbound chats where the other user is a *buyer* (seller viewing thread), `product.seller` is the *current user*, so the header shows self instead of buyer — bug.

Also `ChatThread.jsx:44,30` both call `getThread(listingId, withUser.id)` — so even after `product` loads, header never reconciles with `msgs[].sender/recipient`.

## 4. `InboxPage` plain inbox `m.sender` usage (for contrast)

**File:** `frontend/src/pages/InboxPage.jsx:484-496` — non-chat inbox (`!listingId`):

```js
messages.filter((m) => !m.listingId).map((m) => (
  <p>{m.body.slice(0,80)}</p>
  <p>from {m.sender?.role === "ADMIN" ? "Trend Tribe" : m.sender?.username || "System"}</p>
))
```

- Uses `m.sender.username / role` — available because `getMyMessages:100` includes `sender {username, role}`. No avatar shown in inbox list (by design — system messages).
- Chat rooms list `InboxPage.jsx:449-461` uses `c.otherUser.avatar/username` from `getConversations` — not from `m.sender`. This reinforces that **avatar lives only on `getConversations.otherUser` today**.

## 5. Schema — what *could* be returned

**File:** `backend/prisma/schema.prisma:249-272` `model Message` + `model User:20`

- `Message.senderId / recipientId` both FK → `User`; `User.avatar String?` exists.
- No schema change needed to include `recipient` or `avatar` — just widen the `select`.

## 6. Sample JSON / tests

- Grepped `tests/*.spec.js` (login, admin, smoke, create-listing, edit-listing) — no message shape assertions.
- No committed sample JSON fixture; `backend/.env.example` absent; actual shape must be inferred from controller `select` (above). Recommend adding a Playwright assertion in ticket 28 that `GET /messages/thread` returns `messages[0].recipient.avatar` after fix.

## 7. Decision needed (for ticket 28)

| Option | What changes | Pros | Cons |
|---|---|---|---|
| **A. Extend `getThread` (recommended)** | `message.controller.js:222` → `include: { sender: {select:{id,username,fullName,avatar,role}}, recipient: {select:{id,username,fullName,avatar,role}} }` | Thread self-sufficient; header derivable as `msgs.find(m=>m.senderId !== me || m.recipientId !== me)?.other = senderId===withId ? sender : recipient` — no extra fetch, works offline after first load, fixes avatar for both directions | Adds ~100 bytes/msg; must verify realtime `emitMessage` payload also includes recipient/avatar or re-fetch still needs avatar |
| **B. Pass `otherUser` from conversations** | `InboxPage.jsx:367` → `withUser={convos.find(... )?.otherUser || {id}}` + `ChatThread` prefers `withUser` then `msgs` | Zero backend change; reuses existing avatar | Requires `InboxPage` to have fetched `getConversations` before `ChatThread` mounts — race on deep-link `?thread=` direct navigation (cold start → no conversations yet → header flashes `product.seller`) |
| **C. Hybrid A+B** | Do A plus optionally hydrate `withUser` from conversations for instant first paint | Best UX | Minimal extra code |

**Recommendation:** Do **A** (and C if cheap). Single source of truth = **messages only** (`sender`+`recipient` with `avatar`) — derivation scans `msgs[]` for the participant whose `id === withId` (either as `sender` or `recipient`) and reads `fullName/username/avatar` from that embedded user object. Empty thread (no msgs) keeps skeleton until load; if still empty (e.g. pending `tt_saved_chats` before first POST), fallback to `otherUser` from conversations if available, never to `product.seller`. Ticket 28 should implement this and update `ChatThread.jsx:227` accordingly.

## 8. Exact line to change & risk

**Line:** `backend/src/controllers/message.controller.js:222`

```diff
- const messages = await prisma.message.findMany({ where: whereWithVisibility, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, username: true, fullName: true } } } });
+ const messages = await prisma.message.findMany({ where: whereWithVisibility, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, username: true, fullName: true, avatar: true } }, recipient: { select: { id: true, username: true, fullName: true, avatar: true } } } });
```

- Also update `createMessage:43` (`emitMessage` payload) similarly so the optimistic push already carries avatar/recipient and avoids a re-fetch flicker.
- Risk: **Low** — Prisma `select` widening only, no migration, no breaking change (additive fields). Callers that destructure `sender` keep working. Performance: +1 join on already-indexed `recipientId` (Message `@@index([recipientId])`), negligible for `take:100`. Ensure `avatar` can be `null` (User.avatar `String?`) — frontend already handles `avatar ? <img> : <span initial>` at `ChatThread.jsx:272`.
- Optional: also select `role` if ticket 28 wants to filter admin messages from header (mirrors `getConversations` admin handling).

## 9. Citations

- `backend/src/controllers/message.controller.js:167-239` (getThread), `291-347` (getConversations), `43`, `99-103`
- `backend/prisma/schema.prisma:249-272`, `20`
- `frontend/src/services/messageService.js:39-54`
- `frontend/src/components/chat/ChatThread.jsx:11,27-44,65,227,272`
- `frontend/src/pages/InboxPage.jsx:88,364-368,449-461,484-496`
- `backend/src/routes/message.routes.js:12` (`GET /thread`)

## 10. Open question for ticket 28

- Should the derivation prefer `recipient` object when `senderId === me` (i.e. outbox direction) — yes, to show the other party's name, not own name. Document the one-liner derivation and add empty-thread skeleton vs `product.seller` fallback removal.
