---
label: wayfinder:grilling
status: closed
---

## Question
Frontend half of Web Push: `frontend/src/components/pwa/PWARegister.jsx:42-48` only auto-resubscribes if `Notification.permission === "granted"` already — it never prompts a user who was never asked (`permission === "default"`), so even with a correct backend offline-push trigger (`msg-push-01` through `04`), that user receives nothing. When/where should we request `Notification.requestPermission()` + `subscribePush()` (first login, first chat, `/chat` mount, `InstallPrompt`, or gated banner), how to avoid spamming `default`→`denied` users, and should `isPushSupported()` + `pushSubscription` existence gate the backend `sendPushToUser` skip?

## Resolution
Decision: **Auto Enable on first /chat if `permission==="default"`** (default should be Enable) — `InboxPage.jsx` `isChat` mount `useEffect` checks `isPushSupported() && Notification.permission==="default" && !tt_push_prompt_dismissed` then `requestPermission()` → if `granted` `subscribePush()`, sets `tt_push_prompt_dismissed=1` once. No banner, never prompts `denied`, one-time per device. Backend `sendPushToUser` still no-ops if no sub, but frontend now auto-subscribes `default` users. Independent half from `01-04`.
