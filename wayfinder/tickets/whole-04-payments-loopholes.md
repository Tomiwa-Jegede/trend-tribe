# Ticket — Payments Loopholes

## Question
Payments has `TokenPurchase.amount` Naira vs `GigTokenPurchase.amount` kobo unit mismatch (comment lies), `creditPurchase` side-effects outside transaction, and `expireGigs`/`autoReleaseGigs`/`expireServiceBookings` running per process without distributed lock (double `PlatformProfit` on Render multi-instance). Should we fix comment, wrap wallet/push in transaction, and add `SELECT FOR UPDATE` or `updateMany where status=OPEN` idempotency is enough?

Label: wayfinder:research
Status: open
