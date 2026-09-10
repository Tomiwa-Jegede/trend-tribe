# Ticket — Realtime Delivery (socket vs Pusher double)

## Question
Chat is real-time via `Socket.IO` + `Pusher` fallback — `InboxPage` and `ChatThread` were double-incrementing `favorite`/`view`/`typing` because both transports delivered. Should `favorite`/`view` use absolute `favoriteCount`/`views` from server and `message` dedup via `900ms` key `view:{id}:{views}` / `fav:{id}:{count}`? And when should `✓` vs `✓✓` grey vs `✓✓` blue show — `single` when recipient offline, `double grey` when `deliveredAt || online`, `blue` when `read` (chat open)?

Label: wayfinder:research
Status: closed
Resolution: Yes — favorite/view absolute + 900ms dedup, deliveredAt on fetch + socket + presence fallback for ✓✓ grey, typing 800ms/2s ephemeral, presence in-memory.
Blocks: 06-push-foreground, 08-persistence
