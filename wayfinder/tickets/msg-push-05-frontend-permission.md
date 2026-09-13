---
label: wayfinder:grilling
status: closed
---

## Question
Frontend half of Web Push: `frontend/src/components/pwa/PWARegister.jsx:42-48` only auto-resubscribes if `Notification.permission === "granted"` already — it never prompts a user who was never asked (`permission === "default"`), so even with a correct backend offline-push trigger (`msg-push-01` through `04`), that user receives nothing. When/where should we request `Notification.requestPermission()` + `subscribePush()` (first login, first chat, `/chat` mount, `InstallPrompt`, or gated banner), how to avoid spamming `default`→`denied` users, and should `isPushSupported()` + `pushSubscription` existence gate the backend `sendPushToUser` skip?

## Expanded — low-stakes custom prompt before real browser permission (do not call subscribePush() cold on page load)
Before `Notification.requestPermission()` (real OS dialog), show an in-app soft prompt: e.g. `Enable notifications to get chats when offline?` with `Enable` / `Not now`, explaining value, dismissable, one-time per device via `tt_push_prompt_dismissed`. Only on `Enable` tap then call `requestPermission()` → if `granted` → `subscribePush()`. This avoids cold permission spam and matches best practice. Where should this soft prompt live (`InboxPage.jsx` `/chat` banner, `ChatThread` first open, or global `PWARegister`), and should `Not now` set `dismissed` or allow re-prompt after N days?

## Resolution
Decision: **InboxPage `/chat` banner, dismiss forever** — soft `bg-primary-50` banner on first `/chat` if `isPushSupported() && permission==="default" && !tt_push_prompt_dismissed`, shows `Enable notifications to get chats when you’re offline` + `Enable` (→ `requestPermission()` → if `granted` `subscribePush()`, then `dismissed=1`) + `Not now` (→ `dismissed=1` forever, never re-prompt). Never prompts `denied`. Independent frontend half — does not call `subscribePush()` cold on page load.
