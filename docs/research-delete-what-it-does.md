# Research — What delete actually does for Inbox/Chats bulk and delete-all

**Branch:** `research/delete-persist-what-it-does` · **Map:** [#37 Wayfinder — Deleted inbox/chats reappear after restart](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) · **Ticket:** [#38 Research — What delete actually does for Inbox/Chats bulk and delete-all](https://github.com/Tomiwa-Jegede/trend-tribe/issues/38) · **Date:** 2026-09-13

> Plain English, read-only. No code changed. All claims cited `file:line`.

## 1-sentence gist

Inbox single/bulk/delete-all are **two-sided soft-delete** (`senderDeleted`/`recipientDeleted` flags, hard-delete only after both sides have deleted); **Chats bulk-delete (`POST /conversations/bulk-delete`) is immediate hard-delete** — it marks both flags and then deletes the `Message` rows and the `Conversation` row outright, so the other participant loses the thread too. Every endpoint `await`s the DB before returning `{ ok: true }`, with no transaction wrapper.

---

## What was checked

- `backend/src/controllers/message.controller.js:361-442` — `deleteOne`, `deleteMany` (bulk-delete), `deleteAll`, `deleteConversationsBulk`
- `backend/src/routes/message.routes.js:1-23` — route → controller wiring and method/path shape
- `backend/prisma/schema.prisma:230-272` — `Conversation` and `Message` models (`senderDeleted`, `recipientDeleted`, `conversationId`)
- `frontend/src/pages/InboxPage.jsx:80-310` — which endpoint each button calls and the 10s `pending*Ref` tombstone hold

> Not measured: runtime on Render (replica lag, pooler timing, or DB commit latency) — shape below is per static code only.

---

## Short table — endpoint, what it touches, hard vs soft

| Frontend call | HTTP | Controller | Touches `Message`? | Touches `Conversation`? | Hard vs soft | Two-sided? |
|---|---|---|---|---|---|---|
| Inbox single trash (`handleDeleteOne` `InboxPage.jsx:245-259`) | `DELETE /api/messages/:id` `message.routes.js:21` | `deleteOne` `message.controller.js:361` | Yes — `update` one row then conditional `delete` | No | **Soft then hard-if-both** | Yes — per-side |
| Inbox bulk (`handleDeleteSelected` `InboxPage.jsx:260-275`) | `POST /api/messages/bulk-delete` `message.routes.js:20` | `deleteMany` `message.controller.js:385` | Yes — two `updateMany` + one `deleteMany` | No | **Soft then hard-if-both** | Yes — per-side |
| Inbox/Chats "Delete all" (`handleDeleteAll` `InboxPage.jsx:276-310`) | `DELETE /api/messages` `message.routes.js:19` | `deleteAll` `message.controller.js:402` | Yes — two `updateMany` (all rows) + global `deleteMany` | No | **Soft then hard-if-both (global sweep)** | Yes — per-side, plus global sweep |
| Chats bulk (`handleDeleteSelectedChats` `InboxPage.jsx:214-234`) | `POST /api/messages/conversations/bulk-delete` `message.routes.js:9` | `deleteConversationsBulk` `message.controller.js:414` | Yes — `updateMany` + immediate `deleteMany` per key | **Yes — `conversation.delete`** | **Immediate hard-delete** | **No — deletes for both sides** |

---

## Per-endpoint detail (with cites)

### 1. `DELETE /api/messages/:id` → `deleteOne` — soft, hard only if both sides

`message.controller.js:361-383`:

- Validates `id` and that caller is `senderId` or `recipientId` (`:365-366`).
- Sets **only the caller's side flag**: `if (isSender) data.senderDeleted=true` / `if (isRecipient) data.recipientDeleted=true` (`:367-372`), then `prisma.message.update` (`:372`) — **awaited**.
- Re-reads the row (`:374`) and **only then `prisma.message.delete` if `senderDeleted && recipientDeleted`** (`:375-377`, `.catch(()=>{})`).
- Returns `200 { ok: true }` (`:378`) after those awaits.

So: first deleter soft-hides, second deleter triggers hard row removal. The `Conversation` row is **never touched** here.

### 2. `POST /api/messages/bulk-delete` → `deleteMany` — soft in bulk, hard-if-both

`message.controller.js:385-400`:

- `ids` from body (`:387-389`), parsed to ints (`:389`).
- Two **scoped, per-side** soft deletes, sequential and awaited:
  ```js
  updateMany({ where:{ id:{in:nums}, senderId:req.user.id }, data:{ senderDeleted:true } }) // :391
  updateMany({ where:{ id:{in:nums}, recipientId:req.user.id }, data:{ recipientDeleted:true } }) // :392
  ```
- Then a single hard sweep for fully-deleted rows among those ids (`:394`):
  ```js
  deleteMany({ where:{ id:{in:nums}, senderDeleted:true, recipientDeleted:true } })
  ```
- Returns `200 { ok: true }` (`:395`). No transaction — three separate writes. If process crashes between the two `updateMany`s the row is half-soft-deleted.

`Conversation` not touched.

### 3. `DELETE /api/messages` → `deleteAll` — soft all, global hard sweep

`message.controller.js:402-412`:

- No body. Marks **every** message where caller is sender (`:404`) and every where caller is recipient (`:405`) as deleted for their side — two awaited `updateMany`s.
- Then **global** `deleteMany({ where:{ senderDeleted:true, recipientDeleted:true } })` (`:406`) — not scoped to `req.user.id` or to a conversation. It deletes **any** message in the DB that happens to have both flags true, even if the other half was set by a different user earlier.
- Returns `200 { ok: true }` (`:407`).

Frontend maps this to both Inbox and Chats "Delete all": `InboxPage.jsx:282` (chats path) and `InboxPage.jsx:302` (inbox path) both call `deleteAllMessages()` (`messageService` → `DELETE /messages`). On the Chats tab it also clears local `savedChats`/`localStorage` (`:283-285`) but that's client-only. `Conversation` rows are **not deleted** by this endpoint — verified by grep: no `prisma.conversation` call in `deleteAll`.

### 4. `POST /api/messages/conversations/bulk-delete` → `deleteConversationsBulk` — immediate hard-delete (outlier)

`message.controller.js:414-442` — the one `InboxPage.jsx:220` calls:

- Expects `{ keys: ["thread-a-b", ...] }` (`:416-417`). Each key is parsed as two ints after `thread-` (`:420-422`).
- Per key, tries **per-person Conversation** lookup (`:424`):
  ```js
  findFirst({ where:{ OR:[{buyerId:a,sellerId:b},{buyerId:b,sellerId:a}] } })
  ```
- If `convo` exists and caller is `buyerId` or `sellerId` (`:425`):
  - `updateMany` **all messages in that conversation** where caller is either sender or recipient, **setting both flags at once** (`:426`):
    ```js
    updateMany({ where:{ conversationId: convo.id, OR:[{senderId:req.user.id},{recipientId:req.user.id}] },
                 data:{ senderDeleted:true, recipientDeleted:true } })
    ```
    Unlike `deleteOne`/`deleteMany`, it does not set only the caller's side — it marks both.
  - Then **immediate hard delete** of every message in the conversation, regardless of the other side's prior state (`:427`):
    ```js
    deleteMany({ where:{ conversationId: convo.id } })
    ```
  - Then deletes the `Conversation` row itself (`:428`): `prisma.conversation.delete({ where:{ id: convo.id } })`.

- Else (legacy `thread-listingId-otherId` key that didn't match a Conversation) it does the same **both-flags + hard delete** scoped by `listingId` + pair (`:430-433`).

- After the loop a final global sweep (`:436`): `deleteMany({ where:{ senderDeleted:true, recipientDeleted:true } })`.

- Returns `200 { ok: true }` (`:437`).

Consequences: this is the **only** delete path that removes `Conversation` rows and that hard-deletes messages without waiting for both sides. The other participant's view of that thread is destroyed too, even though they never called delete. The global sweep at `:436` is redundant after the per-conversation hard deletes but mirrors `deleteAll`'s pattern.

### Route wiring

`message.routes.js:6-21` — all routes under `router.use(protect)` (JWT required). Relevant lines:

```js
router.post("/conversations/bulk-delete", deleteConversationsBulk) // :9
router.delete("/", deleteAll)                                        // :19
router.post("/bulk-delete", deleteMany)                              // :20
router.delete("/:id", deleteOne)                                     // :21
```

Note `DELETE /` is registered before `DELETE /:id` and uses a different HTTP method from `POST /bulk-delete`, so there is no Express shadowing — but `GET /` (`:11` → `getMyMessages`) and `GET /:id` (`:16` → `getMessageById`) are order-sensitive; reads vs deletes are separated by method.

---

## Cross-cutting answers the ticket asked for

### Hard vs soft

- `deleteOne` / `deleteMany` / `deleteAll`: **soft-delete with deferred hard-delete** — `Message.senderDeleted` / `recipientDeleted` (`schema.prisma:259-260` default `false`) are set per side; hard `delete`/`deleteMany` only when **both** are true (`:375`, `:394`, `:406`). Rows survive for the other side.
- `deleteConversationsBulk`: **hard-delete** — sets both flags then immediately `deleteMany` + `conversation.delete` (`:426-428`). Rows do not survive.

### Conversation vs Message handling

- `Message` rows: touched by all four.
- `Conversation` rows: **only** touched by `deleteConversationsBulk` (`:428`). `deleteAll` does not delete conversations even when frontend is on the Chats tab — after `DELETE /messages` the `GET /messages/conversations` call (`message.controller.js:302-359`) would still return those `Conversation` rows (with `messages: [lastMessage]` from the now-soft-deleted last message). Chats "Delete all" therefore leaves orphan `Conversation` shells; only the Chats bulk-delete path removes them.

### Two-sided delete

- Inbox paths: correct two-sided semantics — each side flips its own flag (`:370-371`, `:391-392`, `:404-405`); hard delete is the AND (`:375`, `:394`, `:406`).
- Chats bulk path: **not two-sided** — single caller sets **both** flags (`:426`) and hard-deletes the whole thread (`:427-428`), erasing the other user's copy.

### Response timing — does 200 mean committed and readable?

- All four handlers `await` the Prisma writes before `res.status(200).json({ ok:true })` (`:378`, `:395`, `:407`, `:437`). No `res` is sent inside a `.then` without await (contrast `createMessage`'s fire-and-forget `conversation.update` at `:52` — not used here).
- Writes are **not wrapped in `prisma.$transaction`** — `deleteMany` does two `updateMany`s then a `deleteMany` as three separate statements; `deleteConversationsBulk` loops keys sequentially with `await` per iteration but no transaction across keys; `deleteAll`'s final `deleteMany` is global and unscoped.
- Error paths use `.catch(()=>{})` on hard deletes (`:376`, `:394`, `:406`, `:427-428`, `:433`, `:436`) — a hard-delete failure is **silently swallowed** and still returns `ok:true` (soft-delete succeeded). Callers cannot distinguish soft-only from hard.
- Implications for the map's "reappears after restart" bug: a 200 here means the primary DB acknowledged the write (not fire-and-forget), but **read-after-write from a replica or a cached read could still serve stale rows** until replication catches up or cache is busted — that question is for ticket 39/40, not concluded here. The 10s `pendingDeletesRef` / `pendingChatDeletesRef` / `pendingDeleteAllRef` tombstones in `InboxPage.jsx:80-105` and `:220-228`/`:253`/`:289` mask exactly that window client-side (and are cleared after 10s), so any reappearance **after a force-close/reopen past 10s** must be backend serving old data, per map Notes.

### What `ok:true` means (and does not)

- Means: the DB driver resolved the soft-delete `updateMany`(s) (and attempted the hard sweep). Auth passed.
- Does **not** mean: the row is gone for the other side (inbox paths keep it), or that a subsequent `GET /messages` / `GET /messages/conversations` on a replica will hide it, or that `Conversation` rows were removed (they weren't, except via conversations bulk-delete), or that the hard sweep succeeded (swallowed error).

---

## What is intentionally not concluded here (next tickets)

Per map [#37](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) this ticket is diagnosis-only:

- Whether `getMyMessages` (`:90-117`) / `getThread` (`:171-251`) / `getConversations` (`:302-359`) correctly filter `senderDeleted`/`recipientDeleted` on every read — noted as read filters exist (`:96`, `:224-225`, `:326-327`) but full audit is ticket 39.
- Whether any Redis/in-memory cache serves stale reads — ticket 40 (separate research branch).
- DB/API-only reproduction proving deleted data survives a round-trip — ticket 41.
- Fix shape (transaction, hard vs soft, cache bust) — deferred until diagnosis tickets close, per map guardrails.

---

## File cite index (absolute links)

- `backend/src/controllers/message.controller.js:361-383` `deleteOne`
- `backend/src/controllers/message.controller.js:385-400` `deleteMany` (`POST /bulk-delete`)
- `backend/src/controllers/message.controller.js:402-412` `deleteAll` (`DELETE /`)
- `backend/src/controllers/message.controller.js:414-442` `deleteConversationsBulk` (`POST /conversations/bulk-delete`)
- `backend/src/routes/message.routes.js:9` `POST /conversations/bulk-delete` wiring
- `backend/src/routes/message.routes.js:19` `DELETE /` → `deleteAll`
- `backend/src/routes/message.routes.js:20` `POST /bulk-delete` → `deleteMany`
- `backend/src/routes/message.routes.js:21` `DELETE /:id` → `deleteOne`
- `backend/prisma/schema.prisma:230-247` `Conversation` model (`buyerId`/`sellerId` unique, `listingId` nullable)
- `backend/prisma/schema.prisma:249-272` `Message` model (`senderDeleted`, `recipientDeleted`, `conversationId`, `listingId`)
- `frontend/src/pages/InboxPage.jsx:80-105` `pendingDeletesRef` / `pendingChatDeletesRef` / `pendingDeleteAllRef` 10s tombstones
- `frontend/src/pages/InboxPage.jsx:214-234` Chats bulk-delete → `POST /messages/conversations/bulk-delete`
- `frontend/src/pages/InboxPage.jsx:245-275` Inbox `DELETE /:id` and `POST /bulk-delete`
- `frontend/src/pages/InboxPage.jsx:276-310` "Delete all" → `DELETE /messages` (both tabs)

---

## Sources

- `backend/src/controllers/message.controller.js` (read 2026-09-13)
- `backend/src/routes/message.routes.js` (read 2026-09-13)
- `backend/prisma/schema.prisma` (read 2026-09-13)
- `frontend/src/pages/InboxPage.jsx` (read 2026-09-13)
- Map [#37](https://github.com/Tomiwa-Jegede/trend-tribe/issues/37) and ticket [#38](https://github.com/Tomiwa-Jegede/trend-tribe/issues/38) bodies (fetched 2026-09-13)
