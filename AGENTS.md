# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

- Communication: concise, direct, technical; reference file paths as `path:line` when citing code
- Code style: JavaScript (Express/React), no emojis in code, explicit error handling, Prisma for DB, Tailwind for styling
- Verification: `npm test` (Playwright, root), `npm run lint` (frontend), `npm run dev` for local dev (backend port 5050, frontend port 5173), health check at `GET /api/health`
- Workflow: prefer editing existing files over creating new ones; verify with execution before claiming fixes

## Project Overview

Trend Tribe — Student-only peer-to-peer marketplace for campus communities to buy, sell, and trade fashion, accessories and everyday items — free, trusted, and built for students.

**Stack:** Node.js 20 + Express 4 + Prisma 5 + PostgreSQL (backend); React 19 + Vite 8 + React Router 7 + Tailwind CSS 3 + Axios + Framer Motion (frontend); npm; Playwright 1.62 for e2e; Cloudinary + Multer for images; Brevo for email OTP; Flutterwave for token payments; JWT + bcryptjs auth; Helmet/CORS/Morgan hardening; Netlify for frontend hosting

**Repo layout:**
- `/` — root workspace: `package.json` (Playwright), `playwright.config.js`, `tests/` (e2e), `netlify/` + `netlify.toml`
- `backend/` — Express API: `src/index.js`, `src/routes/`, `src/controllers/`, `src/middleware/`, `src/validators/`, `src/config/`, `prisma/schema.prisma`
- `frontend/` — Vite React app: `src/pages/`, `src/components/`, `src/context/`, `src/api/`, `src/services/`, `public/`, `index.html`
- `delivery-management/` — engineering delivery planning (roadmap + milestone trackers)
- `product-management/` — value workspace (value map + opportunity map)

## Repository Layout Contract

- Git: single repo `Tomiwa-Jegede/trend-tribe`, default branch `main`; do not commit generated `node_modules/`, `dist/`, `test-results/`, `playwright-report/`
- Ignores: root `.gitignore` covers `node_modules/`, `.env*` (except `.env.example`), `test-results/`, `playwright-report/`, `.netlify/`; `backend/.gitignore` adds `dist/` and `src/generated/prisma`; `frontend/.gitignore` adds `dist`, `dist-ssr`, `*.local`
- Secrets: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CLOUDINARY_*`, `BREVO_API_KEY`, `FLUTTERWAVE_SECRET_HASH` live in `.env` (never committed); `.env.test` for Playwright; `backend/prisma.config.ts.bak` is git-ignored backup
- Lockfiles: commit `package-lock.json` at root, `backend/`, `frontend/`; use `npm ci` in CI
- Artifacts: Prisma migrations in `backend/prisma/migrations/`; uploaded images in Cloudinary, not repo

## Backend Direction

- Owns: auth (register/OTP/verify, login, JWT, forgot/reset password), listings CRUD with Cloudinary images, favorites/reports, user profiles, admin operations, Frederick AI sessions, token purchases + Flutterwave webhook, health check
- Contracts: all routes under `/api/*` with `express.json()` (except `/api/payments/webhook` uses `express.raw` for hash verification); Prisma is the only DB access layer; every controller validates input via `express-validator`
- Execution order: schema change -> `npx prisma migrate dev` + `prisma generate` -> controller/route update -> manual `GET /api/health` + e2e

## Frontend Direction

- Owns: public pages (Home, Marketplace, ListingDetail), auth flows (Login/Register/VerifyOtp/Forgot/Reset), protected pages (Create/Edit Listing, Profile/EditProfile, Favorites, TokenCallback), admin pages (Dashboard/Users/Listings/Reports), shared layout (Navbar/Footer/PageTransition/FrederickWidget)
- Contracts: SPA with `react-router-dom` 7; API via `axios` in `src/api/` + `src/services/`; auth state in `src/context/AuthContext`; styling via Tailwind; lazy-load heavy pages via `React.lazy`
- Guardrails: `ProtectedRoute` for auth, `AdminRoute` for role `ADMIN`; GA4 pageview tracking via `usePageviewTracking`; handle loading/spinner + 404 explicitly

## Cross-Module Contracts

- API boundary: frontend calls backend at `config.clientUrl` origin via CORS `credentials:true`; backend validates JWT in `Authorization: Bearer <token>` header; frontend stores token in context/localStorage and injects via axios interceptor
- Data shape: Prisma `User`, `Listing`, `Favorite`, `Report`, `TokenPurchase`, `FrederickSession` are canonical; frontend types must align with `prisma/schema.prisma` enums (`Role`, `Category`, `Condition`, `ReportReason`)
- Image flow: `Multer` + `multer-storage-cloudinary` on backend; frontend uploads via `multipart/form-data` to `/api/upload`; `Listing.images` + `imagePublicIds` stay in sync
- Verification: `npm test` runs Playwright against both servers (`backend` health at `:5050/api/health`, `frontend` at `:5173`); do not mark value delivered until Playwright or manual flow proves the visible moment

## Child DOX Index

This root doc owns:
- `/` — repo root and cross-module contracts
- `backend/` — Express + Prisma API (code-local docs own implementation detail)
- `frontend/` — Vite React SPA (code-local docs own implementation detail)
- `delivery-management/` — Engineering delivery planning (sequencing by dependency)
- `product-management/` — Product value workspace (value by stakeholder)

Child docs:
- `delivery-management/AGENTS.md` — Delivery workspace contract: roadmap and milestone tracking
- `product-management/AGENTS.md` — Value workspace contract: value map and opportunity analysis
