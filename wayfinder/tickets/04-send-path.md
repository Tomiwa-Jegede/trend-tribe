# Ticket — Send Path and Validation

## Question
`POST /messages {listingId, body, recipientId}` was blocking seller replies as `You cannot message your own listing` and `handleSend` cleared input before await (swallowing errors, +2 duplicate via socket+Pusher). Should seller reply use `recipientId: withUser.id`, validate `recipientId !== me`, keep text until success, show `Failed to send — tap to retry`, and dedup via `favoriteCount`-style absolute `deliveredAt`/`read`?

Label: wayfinder:task
Status: closed
Resolution: Yes — send with recipientId, allow seller reply when recipient provided, keep text until 201, show retry, disable while sending, dedup via absolute counts and 900ms.
Blocks: 05-realtime-delivery
