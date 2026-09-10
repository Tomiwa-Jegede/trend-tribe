# Ticket — First-Contact Empty Room

## Question
On first Contact Seller (no messages yet), the chat currently showed `? · Chat` / `Chat 50 · Listing #50` before listing fetch. Should it show a skeleton until `getListingById` resolves, and fallback to `product.seller` for `withUser` name/avatar? And should the pending room be saved in `tt_saved_chats` so Close collapses not deletes?

Label: wayfinder:prototype
Status: closed
Resolution: Skeleton until getListingById resolves, then Seller Name · Listing Title; fallback to listing.seller; list Tap to open chat, thread empty bubble + product card.
Blocks: 06-push-foreground
