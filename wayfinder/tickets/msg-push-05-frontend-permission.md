---
label: wayfinder:grilling
status: closed
---

## Question
Frontend half of Web Push: `frontend/src/components/pwa/PWARegister.jsx:42-48` only auto-resubscribes if `Notification.permission === "granted"` already — it never prompts a user who was never asked (`permission === "default"`), so even with a correct backend offline-push trigger (`msg-push-01` through `04`), that user receives nothing. When/where should we request `Notification.requestPermission()` + `subscribePush()` (first login, first chat, `/chat` mount, `InstallPrompt`, or gated banner), how to avoid spamming `default`→`denied` users, and should `isPushSupported()` + `pushSubscription` existence gate the backend `sendPushToUser` skip?

## Resolution
Decision: **Banner on first /chat if `permission==="default"` + `isPushSupported()`** — `InboxPage.jsx`/`ChatThread` mount shows soft banner "Enable notifications to get chats when offline" with `Enable` → `requestPermission()` + `subscribePush()`, never prompts if `denied`, one-time per device via `localStorage tt_push_prompt_dismissed`. Backend `sendPushToUser` still safely no-ops if no subscription (0 sent), but frontend now ensures `default` users get chance. Independent half from backend `01-04`.
