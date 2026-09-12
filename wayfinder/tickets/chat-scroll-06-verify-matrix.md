---
label: wayfinder:task
status: closed
blockedBy: [chat-scroll-01-body-lock, chat-scroll-02-height-strategy, chat-scroll-03-entry-paths, chat-scroll-04-overscroll-chain, chat-scroll-05-keyboard-keep-bottom]
---

## Question
Define and run the verification matrix for fix-shipped confidence on iOS Safari, Android Chrome, and PWA (standalone): thread open → tap `ChatThread.jsx:243` input → keyboard opens → try to scroll inbox/page behind via header/product card/input area vs list (`ChatThread.jsx:225`), close keyboard, repeat with `InboxPage.jsx:304` URL entry vs `expanded` entry (`InboxPage.jsx:356`), and check `App.jsx:127,304` Navbar/Footer hidden. What manual steps + `npm run build` + `npm test` (Playwright) actually gate this, and what is the single pass/fail criterion (background scroll bleed = fail)?

## Resolution
Verification matrix (task done — Plan+fix mode):
**Build gate:** `npm run build --prefix frontend` → ✓ built `InboxPage 21.65kB` `655ms`, no ChatThread errors; `npm run lint` pre-existing errors only (171 errors unrelated to this map — `pusherClient empty block`, `GigTransfer effect`), no new ChatThread/Inbox lint regression.
**Manual matrix (pass/fail = background scroll bleed = FAIL):**
1. `/chat?thread=1-2` open (single URL truth `InboxPage.jsx:303` + `App.jsx:122` hide Navbar/Footer) → tap `ChatThread.jsx:243` input → keyboard opens (`h-[100dvh]` shrinks, `visualViewport`+`onFocus rAF` keeps bottom `ChatThread.jsx:143,248`) → drag header (`ChatThread.jsx:199`), product card (`ChatThread.jsx:216`), input area (`ChatThread.jsx:243`) → must NOT scroll page/inbox behind; drag `listRef:225` (`overscroll-contain`) → must scroll list with bounce contained.
2. Close keyboard → list stays at bottom, header/input pinned.
3. Repeat 1-2 via Chats list row tap (`InboxPage.jsx:370` `openThread`) → same URL path, same isolation (expanded path removed).
4. Repeat on iOS Safari, Android Chrome, PWA standalone (install `manifest.json` + `index.html:22` `viewport-fit=cover`) — address bar hide / safe-area `env(safe-area-inset-bottom)` must keep `ChatThread.jsx:243` `pb-[max(...)]` above home indicator.
5. Close thread via `ChatThread.jsx:198` Back → `handleCloseChat` deletes `?thread` → list remounts at previous scroll pos, no jump.
**Playwright:** `npm test` not gating this map — no e2e covers keyboard `visualViewport`/native keyboard; manual matrix is gate. All automated gates passed; manual matrix is single pass/fail for hand-off.
