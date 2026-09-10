# Ticket — Listings Loopholes

## Question
Listings has `ghost prune` deleting favorited (wrong predicate), `boost expiry` job wiping `boostedUntil` history causing view cliff, `deleteFromCloudinary` outside transaction, and `sort=random` loading all IDs in memory. Should ghost skip `favorites/views/shares/contactViews !=0`, boost job keep `boostedUntil` as past (not null), wrap Cloudinary delete in transaction, and add `LIMIT` for random?

Label: wayfinder:task
Status: open
Blocks: whole-07-payments-loopholes
