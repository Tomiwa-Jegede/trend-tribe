# Ticket — Thread Identity (buyer, seller, listing)

## Question
What is the canonical thread key — `(buyer, seller)` like WhatsApp or `(buyer, seller, listing)` like marketplace per-listing? How is `thread-{listingId}-{otherId}` stored and grouped in `getConversations`, and does a thread exist before the first message (saved pending in localStorage) or only after `POST /messages`?

Label: wayfinder:grilling
Status: closed
Resolution: Merge per-person `(buyer,seller)` single thread (not per-listing); empty room exists before first message (saved); migrate to real Conversation table @@unique([buyerId,sellerId]) with listingId nullable for context; deleted/sold → block sends and show Product no longer available.
Blocks: 03-first-contact-empty, 05-realtime-delivery, 07-inbox-split
