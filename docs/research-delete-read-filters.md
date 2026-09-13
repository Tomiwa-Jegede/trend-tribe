# Research — Do all read queries filter soft-deleted rows (messages and conversations)

**Branch:** `research/delete-persist-read-filters` · **Map:** [#37 Wayfinder — Deleted inbox/chats reappear after restart](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) · **Ticket:** [#40 Research — Do all read queries filter soft-deleted rows (messages and conversations)](https://github.com/Tomiwa-Jegede/trend-tribe/issues/40) · **Date:** 2026-09-13

> Plain English, read-only. No code changed. All claims cited `file:line`.

## 1-sentence gist

**Most read paths correctly filter `senderDeleted`/`recipientDeleted`; two paths leak:** `GET /messages/conversations` (`getConversations`) returns a soft-deleted `lastMessage` (and keeps empty conversations) because its top-level and `messages.take:1` sub-query have no deleted filter; `GET /messages/:id` (`getMessageById`) returns a soft-deleted row with no `recipientDeleted` check. `GET /messages` and `GET /messages/thread` are correct.

---

## What was checked

- `backend/src/controllers/message.controller.js:1-444` — `getMyMessages`, `getThread`, `getConversations`, `getMessageById`, `getUnreadCount`, `createMessage`, `delete*` writers, `Conversation`/`Message` Prisma calls
- `backend/src/routes/message.routes.js:1-23` — route → controller wiring
- `backend/prisma/schema.prisma:230-272` — `Conversation` (no deleted flag) and `Message { senderDeleted, recipientDeleted, conversationId, listingId }`
- `backend/src/controllers/support.controller.js:39-177` — parallel support `getThread`/`listSupport`/`adminGetThread` soft-delete handling (for contrast)

> Not measured: live Render/Postgres data or frontend `InboxPage.jsx` 10s tombstones — only whether the SQL/Prisma the server would emit filters deleted rows.

---

## Per-endpoint audit

### 1. `GET /api/messages` → `getMyMessages` — **PASS (with pagination nuance)**

`message.controller.js:88-117`:

```js
// :96
const where = { OR: [{ recipientId: req.user.id, recipientDeleted: false },
                     { senderId: req.user.id, senderDeleted: false }] };
// :98-99
prisma.message.findMany({ where, orderBy:{createdAt:"desc"}, skip, take:limitNum, include:{...} })
// :109-110
prisma.message.count({ where:{ recipientId:req.user.id, recipientDeleted:false } })
prisma.message.count({ where:{ recipientId:req.user.id, recipientDeleted:false, read:false } })
```

- **Filters correctly.** The `findMany` `where` at `:96` is an `OR` over the caller's two sides, each gated by its own flag (`recipientDeleted:false` for inbox, `senderDeleted:false` for sent). A row soft-deleted for this user (`recipientDeleted:true` when they are recipient, or `senderDeleted:true` when they are sender) is excluded; the other side's flag is irrelevant, which is the intended two-sided semantics (`schema.prisma:259-260` defaults `false`).
- **No leak.** Verified exhaustive search: every `prisma.message.findMany/count` feeding Inbox is in this block; no bare `findMany` without those flags for this route.
- **Nuance, not a leak:** `totalCount` at `:109` counts only received (`recipientId`) not sent, so pagination `totalPages` reflects inbox size, not inbox+sent — visible in UI as Inbox badge vs total list mismatch, but it does filter `recipientDeleted`. The `unreadCount` at `:110` also filters correctly.
- **Not checked here but related:** `createMessage` at `:67` counts `recipientDeleted:false` for badge push — that read is filtered too.

**Verdict: read correctly hides soft-deleted rows.**

### 2. `GET /api/messages/thread` → `getThread` — **PASS**

`message.controller.js:171-251`:

- Conversation resolution at `:179-186` is by `buyerId/sellerId` only — correct, `Conversation` has **no** `senderDeleted` field (`schema.prisma:230-247`), so nothing to filter there.
- Message lookup branches at `:191-222` (`listingId` vs no `listingId`, `conversation` found vs not) build a base `where` over `conversationId`/`listingId`/`senderId`/`recipientId`.
- Visibility is then intersected at `:224-227`:

```js
// :224-225
const visibility = { OR: [{ senderId: req.user.id, senderDeleted: false },
                          { recipientId: req.user.id, recipientDeleted: false }] };
const whereWithVisibility = { AND: [where, visibility] };
// :226
prisma.message.findMany({ where: whereWithVisibility, orderBy:{createdAt:"asc"}, take:100, ... })
```

- That `AND` + inner `OR` means: show a row only if **this user is a participant and has not soft-deleted their side**. A recipient who called `deleteOne`/`deleteMany`/`deleteAll` (`recipientDeleted:true`) will not see those rows; a sender who deleted (`senderDeleted:true`) likewise hides them. The other side still sees them. Legacy per-listing path (`listingId` + `conversationId:null` at `:193-201` and `:207-214`) is wrapped by the same `whereWithVisibility`, so legacy and current paths are equally protected.

**Verdict: correct. This is the best-filtered read in the file.**

### 3. `GET /api/messages/conversations` → `getConversations` — **FAIL — two misses**

`message.controller.js:302-359` powers the Chats tab. It has two data sources:

#### a) Conversation listing itself — no deleted filter, keeps empty shells after soft-delete

```js
// :305-314
const convos = await prisma.conversation.findMany({
  where: { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }] },
  orderBy: { lastMessageAt: "desc" }, take:50,
  include: {
    buyer:{...}, seller:{...}, listing:{...},
    messages: { orderBy:{createdAt:"desc"}, take:1 }, // :313 — NO where
  },
});
```

- Top-level `where` filters only participant (`buyerId`/`sellerId`). `Conversation` has no `senderDeleted`/`recipientDeleted` column (`schema.prisma:230-247`), and the query does **not** filter to conversations that still have a visible message for this user. After `deleteAll` (`message.controller.js:402-412`, which marks `Message.senderDeleted/recipientDeleted` but **never touches `Conversation`**) or any single/bulk inbox soft-delete, the `Conversation` row survives and is still returned here. The ticket's "separate conversations-list query vs messages query" concern is exactly this: the row is not derived from message visibility.
- `filtered = convos` at `:317` is a no-op (no filter). The only inbox-relevant filtering is at `:326` for the legacy path, not here.
- Consequence: after user deletes all Inbox messages but not via `POST /conversations/bulk-delete`, Chats still lists the conversation tile. If the frontend hid it only with the 10s `pendingChatDeletesRef` hold, it reappears after restart/file reload when the server again enumerates the `Conversation`.

#### b) `lastMessage` sub-query includes soft-deleted rows

```js
// :313
messages: { orderBy:{createdAt:"desc"}, take:1 }
```

- No `where` at all, let alone `OR:[{senderId:user,senderDeleted:false},{recipientId:user,recipientDeleted:false}]`. So the single most-recent `Message` for that conversation is returned even if this user soft-deleted it. The tile shows a message body the user deleted.
- Contrast: the per-conversation `unreadCount` at `:320` **does** filter correctly:

```js
// :320
prisma.message.count({ where:{ conversationId:c.id, recipientId:req.user.id, recipientDeleted:false, read:false } })
```

Legacy per-listing supplement at `:326-327` **does** filter correctly (`senderDeleted:false`/`recipientDeleted:false` + `conversationId:null`), then at `:342-352` merges into the map — so pure legacy threads are protected, but the primary Conversation-sourced tiles are not.

**Verdict: miss.** Any `Conversation` whose `take:1` last message is soft-deleted leaks that message; any conversation soft-deleted only at the message layer leaks as an empty shell. Fix would push soft-delete into the `messages` include `where` and optionally skip conversations whose newest visible message is null.

### 4. Legacy per-listing path inside `getConversations` — **PASS** (standalone)

```js
// :326-327
prisma.message.findMany({
  where:{ OR:[{senderId:req.user.id,senderDeleted:false},{recipientId:req.user.id,recipientDeleted:false}],
          listingId:{not:null}, conversationId:null }, ... })
```

Correctly filtered. But it is only the fallback for `conversationId:null` rows; it does not rescue the primary Conversation `take:1` miss above. Also `unread` at `:349` is computed from the already-filtered `legacyFiltered` array inclusive of `!x.read` but not re-checking `recipientDeleted` because the source array is pre-filtered — still correct.

### 5. `GET /api/messages/:id` → `getMessageById` — **FAIL — returns soft-deleted row**

`message.controller.js:119-132`:

```js
// :123
const msg = await prisma.message.findUnique({ where:{id}, include:{sender:{...},listing:{...}} });
if (!msg || msg.recipientId !== req.user.id) return res.status(404).json({error:"Not found"});
// :126
if (!msg.read) await prisma.message.update({ where:{id}, data:{read:true} }).catch(()=>{});
return res.status(200).json({ message:{...msg, read:true} });
```

- No `where` or post-check on `recipientDeleted`/`senderDeleted`. A recipient who already soft-deleted this message (`recipientDeleted:true` via `deleteOne` at `:370-371`) can still fetch it by id; the handler will also auto-mark it read. The row is served "as if not deleted."
- Scope: `InboxPage.jsx` does not call `GET /:id` in normal inbox browsing (it uses `GET /` + `GET /thread`), so this does not drive the "delete reappears after restart" Chats/Inbox list bug directly — but any detail view, link-share, or `markRead` flow that resolves via `getMessageById` leaks.
- Sibling `markRead` at `:134-146` similarly does not check deleted state (it does `findUnique where:{id}` then `recipientId` check only); `markAllRead` at `:148-156` marks all `recipientId:req.user.id, read:false` rows regardless of `recipientDeleted` (no filter) — the latter just flips `read` on already-hidden rows, benign but extra work.

**Verdict: miss.**

### 6. `GET /api/messages/unread-count` → `getUnreadCount` — **PASS**

`message.controller.js:158-169`:

```js
// :162
prisma.message.count({ where:{ recipientId:req.user.id, recipientDeleted:false, read:false, listingId:{not:null}, sender:{role:{not:"ADMIN"}} } })
```

Correctly includes `recipientDeleted:false`. Also excludes admin/system messages via `sender.role not ADMIN` + `listingId not null` — intentional chat-only count, not a deletion concern.

### 7. Other read-like paths that surface messages

- `support.controller.js:44-53` `getThread` (user support) — **PASS**: explicit `AND [OR:{senderId:user,senderDeleted:false} / {recipientId:user,recipientDeleted:false}]`.
- `support.controller.js:72-88` `listSupport` (admin) — **FAIL (admin view, out of ticket scope but noted)**: `where:{listingId:null}` with no deleted filter, returns soft-deleted support messages to admin.
- `support.controller.js:146-152` `adminGetThread` — **FAIL similarly**: no `senderDeleted`/`recipientDeleted` filter.
- `support.controller.js:11` `contact` day-limit count and `realtime.js:102-123` presence/delivered lookups — not inbox/chats list reads; not ticket scope.

Official ticket scope (`GET /messages`, `GET /messages/conversations`, legacy path, Conversation listing) is therefore **mostly filtered, with the two misses above**.

---

## Short table — does each read filter soft-deleted rows?

| Read | Controller | Where clauses (senderDeleted/recipientDeleted) | Filters? | Gist |
|---|---|---|---|---|
| `GET /messages` (Inbox) | `message.controller.js:96,109,110` | `where:{OR:[{recipientId,recipientDeleted:false},{senderId,senderDeleted:false}]}` | **Yes** | Inbox + sent correctly hidden per-side |
| `GET /messages/thread` | `message.controller.js:224-227` | `AND [baseWhere, visibility{OR:[{senderId,senderDeleted:false},{recipientId,recipientDeleted:false}]}]` | **Yes** | Legacy and current both wrapped |
| `GET /messages/conversations` — conversation rows | `message.controller.js:305-306` | `where:{OR:[{buyerId:user},{sellerId:user}]}` — no deleted field | **No — by design Conversation has no deleted flag; orphan shells leak after inbox-only delete** | Chats tile persists after `deleteAll`/inbox deletes |
| `GET /messages/conversations` — `lastMessage` subquery | `message.controller.js:313` | `messages:{orderBy:desc,take:1}` — no `where` | **No — returns soft-deleted lastMessage** | Deleted message re-served as preview |
| `GET /messages/conversations` — `unreadCount` | `message.controller.js:320` | `where:{conversationId,recipientId,recipientDeleted:false,read:false}` | **Yes** |  |
| `GET /messages/conversations` — legacy supplement | `message.controller.js:326-327` | `where:{OR:[{senderId,senderDeleted:false},{recipientId,recipientDeleted:false}], listingId!=null, conversationId:null}` | **Yes** |  |
| `GET /messages/:id` | `message.controller.js:123` | `findUnique where:{id}` + `recipientId` check only | **No — returns soft-deleted** | Single-message leak |
| `GET /messages/unread-count` | `message.controller.js:162` | `where:{recipientId,recipientDeleted:false,read:false,...}` | **Yes** |  |

---

## Is there a path that still returns soft-deleted rows as if not deleted?

**Yes — two, one of which directly explains "delete reappears" in Chats:**

1. **Chats conversation listing (`GET /messages/conversations`)** — the primary defect. After any inbox-side soft-delete (`deleteOne` at `:370-371`, `deleteMany` at `:391-392`, `deleteAll` at `:404-405`) the `Conversation` row is still enumerated (`:305-306`) and its `messages.take:1` at `:313` re-serves the deleted row without a `senderDeleted`/`recipientDeleted` check. A user who deletes Chats via Inbox "Delete all" (`DELETE /messages` → `deleteAll`, which never deletes `Conversation` at `:402-412`) will still see the Chats tile after restart — server-side reappearance, not just client cache. Only `POST /conversations/bulk-delete` (`deleteConversationsBulk` at `:426-428` sets both flags and `conversation.delete`) removes the shell. This matches the map's "delete reappears after restart" signature when user deleted via Inbox vs via Chats bulk-delete.

2. **`GET /messages/:id`** — secondary leak. `recipientDeleted:true` rows are fetchable. Not used for the Inbox/Chats list bug, but any direct link to a deleted message still resolves. `adminGetThread`/`listSupport` share the same gap but are admin/support scope.

All other reads in scope (`GET /messages`, `GET /thread`, the conversation `unreadCount`, and the legacy `conversationId:null` supplement) **do** filter and would not resurrect deleted rows on their own.

---

## What a correct filter looks like (for fix planning, not implemented here)

- `getConversations` `include.messages` should be:

```js
messages: {
  where: { OR: [{ senderId: req.user.id, senderDeleted: false },
                { recipientId: req.user.id, recipientDeleted: false }] },
  orderBy: { createdAt: "desc" },
  take: 1,
}
```

and the caller should skip conversations where `messages[0]` is null (no visible message) — or drive `getConversations` from `Message` visibility rather than raw `Conversation`.

- `getMessageById` should 404 when `recipientDeleted:true` (for recipient caller) or `senderDeleted:true` if sender-visible variant is ever allowed — currently only recipient can fetch, so check `msg.recipientDeleted === false` or add to `where`.

Neither change was made here (research-only branch).

---

## File cite index

- `backend/src/controllers/message.controller.js:96` `getMyMessages` visibility `OR`
- `backend/src/controllers/message.controller.js:98-108` `getMyMessages` `findMany` where
- `backend/src/controllers/message.controller.js:109` `getMyMessages` `totalCount` `recipientDeleted:false`
- `backend/src/controllers/message.controller.js:110` `getMyMessages` `unreadCount` `recipientDeleted:false`
- `backend/src/controllers/message.controller.js:119-132` `getMessageById` no deleted filter (miss)
- `backend/src/controllers/message.controller.js:158-169` `getUnreadCount` `recipientDeleted:false`
- `backend/src/controllers/message.controller.js:171-251` `getThread` full
- `backend/src/controllers/message.controller.js:224-227` `getThread` `visibility` + `whereWithVisibility`
- `backend/src/controllers/message.controller.js:302-359` `getConversations` full
- `backend/src/controllers/message.controller.js:305-314` `getConversations` `conversation.findMany` + bare `messages take:1` (miss)
- `backend/src/controllers/message.controller.js:320` `getConversations` `unreadCount` filtered
- `backend/src/controllers/message.controller.js:326-327` `getConversations` legacy `findMany` filtered
- `backend/src/routes/message.routes.js:10-12` `GET /conversations` → `getConversations`, `GET /` → `getMyMessages`, `GET /thread` → `getThread`
- `backend/prisma/schema.prisma:230-247` `Conversation` model (no deleted column)
- `backend/prisma/schema.prisma:249-272` `Message` model (`senderDeleted`, `recipientDeleted`, `conversationId`)
- `backend/src/controllers/support.controller.js:44-53` support `getThread` filtered (contrast)
- `backend/src/controllers/support.controller.js:72` `listSupport` no deleted filter
- `backend/src/controllers/support.controller.js:146` `adminGetThread` no deleted filter

---

## Sources

- `backend/src/controllers/message.controller.js` (read 2026-09-13)
- `backend/src/routes/message.routes.js` (read 2026-09-13)
- `backend/prisma/schema.prisma` (read 2026-09-13)
- `backend/src/controllers/support.controller.js` (read 2026-09-13)
- `backend/src/db.js`, `backend/src/index.js` (read 2026-09-13, for Conversation deviance context)
- Map [#37](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) and ticket [#40](https://github.com/Tomiwa-Jegede/trend-tribe/issues/40) bodies (fetched 2026-09-13)

