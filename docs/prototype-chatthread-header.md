# Prototype — ChatThread header states (issue #30)

Date: 2026-09-13 | Map #25 | Branch: `prototype/chatthread-header-states`

This is a cheap outline prototype for reaction — not shippable code but the spec rendered as states.

## 1. File map
- `frontend/src/components/chat/ChatThread.jsx:227` — replace seller-guess with derivation `useMemo` per ticket 28
- `frontend/src/pages/InboxPage.jsx:367` — enrich `withUser` with `otherUser` when available (ticket 27)
- `frontend/src/pages/InboxPage.jsx:14-59` — PendingChatRow person vs product separation (ticket 29)

## 2. States

### State A — Loading (both `product` and `msgs` pending)
Reuses current skeleton `ChatThread.jsx:229-262` unchanged:
```
[ header skeleton: avatar grey circle, name bar, Back ]
[ product card skeleton: grey thumb + title bar ]
[ messages area: 3 pulsing bubbles ]
[ input bar: grey field + Send disabled ]
```
No person guess — skeleton is honest.

### State B — Empty thread (loaded, `msgs.length===0`)
- Header: `displayUser === null` → avatar `?` on `primary-100`, name `Chat`, subtitle `Offline` or `No messages yet — send the first`
- Product card: real `product.title`/`price` if `getListingById` succeeded, else `Product no longer available` copy (but header name stays `Chat`, NOT the product title)
- Messages area: empty, centered hint `No messages yet — tap to say hi` (optional, not in current UI)
- Avatar logic: `displayUser?.avatar ? <img> : <span>?</span>` already at line 272

### State C — With messages (derived otherUser)
After `getThread` returns ≥1 message (with `sender`+`recipient` incl. avatar after backend fix):
```
derivedOther = msgs.find(m=>m.senderId===withId)?.sender || msgs.find(m=>m.recipientId===withId)?.recipient
displayUser = derivedOther || enrichedWithUser
Header shows: derivedOther.avatar/fullName + online dot (keyed on withUser.id) + typing...
```
Product card unchanged (links to `/listings/${product.slug||id}`). No layout shift vs now — same  `w-9 h-9 rounded-full`, same `truncate` name line.

Example derived:
- buyer viewing seller thread: `otherId=sellerId`, first msg `senderId=buyer` → `recipient=seller` object gives seller name/avatar
- seller viewing buyer thread: `otherId=buyerId`, reply `senderId=seller` → `recipient=buyer` object gives buyer name/avatar (previous bug showed self)

### State D — Deleted listing (404)
- `getListingById` 404 → `product = {id:listingId, title:"Product no longer available", isAvailable:false, images:[]}` synthesized for card only
- Header: still shows derivedOther / enrichedWithUser / `?` placeholder — never `Product no longer available` as person name
- Card: grey thumb, `Product no longer available` copy, disabled link or plain div
- PendingChatRow same split: `displayName = other?.fullName || Chat {id}`, `avatar = other?.avatar || null` — never `listing.title` or `listing.images[0]`

## 3. Code stub for review (diff outline)
```diff
// ChatThread.jsx
- const displayUser = withUser?.fullName || withUser?.username ? withUser : product?.seller || withUser;
+ const derivedOther = useMemo(() => {
+   if (!msgs?.length || !withUser?.id) return null;
+   const fromSender = msgs.find(m => m.senderId === withUser.id)?.sender;
+   if (fromSender?.username || fromSender?.fullName) return fromSender;
+   const fromRecipient = msgs.find(m => m.recipientId === withUser.id)?.recipient;
+   if (fromRecipient?.username) return fromRecipient;
+   return null;
+ }, [msgs, withUser?.id]);
+ const displayUser = derivedOther || (withUser?.fullName || withUser?.avatar ? withUser : null);
// header render: displayUser?.avatar ? <img> : <span>{displayUser?.fullName?.[0] || "?"} — unchanged, but now never reads product
// product fetch stays for card only

// InboxPage.jsx
- <ChatThread listingId={lid} withUser={{id:withId}} />
+ const otherUser = conversations.find(c=>c.otherUser.id===withId && c.listing.id===lid)?.otherUser || null;
+ <ChatThread listingId={lid} withUser={otherUser ? otherUser : {id:withId}} />

// PendingChatRow.jsx
- const other = listing?.seller && listing.seller.id===otherId ? listing.seller : {id:otherId, ...listing?.seller}
- const displayName = other?.fullName || listing?.title || Chat
- const avatar = other?.avatar || listing?.images?.[0]
+ const other = otherUser && otherUser.id===otherId ? otherUser : null;
+ const displayName = other?.fullName || other?.username || `Chat ${listingId}`;
+ const avatar = other?.avatar || null;
```

## 4. Backend diff (for reference)
```diff
// message.controller.js:222
- include: { sender: { select: {id, username, fullName} } }
+ include: { sender: {select:{id,username,fullName,avatar}}, recipient:{select:{id,username,fullName,avatar}} }
// message.controller.js:43 same widen
```

## 5. Open for reaction
- Should empty-state header also show subtle product thumb inside avatar stack, or keep person-only? Current keeps header person-only, card shows product — cleaner.
- Should we add `role` to select for admin filtering or defer?
