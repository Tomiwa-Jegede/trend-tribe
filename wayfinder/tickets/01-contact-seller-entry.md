# Ticket — Contact Seller Entry

## Question
When buyer clicks Contact Seller, what happens before the chat room opens? Should it increment `contactViews`, block self-contact and sold listings, and where should auth redirect go — and should it auto-send a canned product message or just open an empty room with product header?

Label: wayfinder:grilling
Status: closed
Resolution: Sold → show SOLD overlay, block contactViews; self-contact blocked in both entry points; auth preserves ?thread via state.from; contactViews only on first Send, not on open. No auto-send.
Blocks: 02-thread-identity, 04-send-path
