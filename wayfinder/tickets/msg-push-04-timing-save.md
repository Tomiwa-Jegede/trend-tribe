---
label: wayfinder:grilling
status: closed
blockedBy: [msg-push-01-eligibility, msg-push-02-payload-mechanism]
---

## Question
When should the offline check + `sendPushToUser` run relative to the `prisma.message.create` + `prisma.conversation.upsert` transaction: immediately after `create` but before `emitMessage`/`emitNotification`, fire-and-forget after response (like current `message.controller.js:60` `.then` after `create`), or awaited before `res 201`? How to handle push failure (expired subscription, push 410) without failing the message save, and should `conversation.lastMessageAt` touch still happen if push is skipped?

## Resolution
Decision: **Fire-and-forget after 201** — `prisma.message.create` + `conversation.upsert` + `lastMessageAt` touch + `emitMessage` stay unconditional, then `if (!isOnline(recipientId)) sendPushToUser(...).catch(()=>{})` fire-and-forget, never blocks `res 201`. Push 410/404 auto-deletes subscription via `push.js`, never fails save.
