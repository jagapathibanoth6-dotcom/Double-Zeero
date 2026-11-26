# CLAUDE.md

Guide for Claude Code working in this repository.

## What this is
Double Zero Pizzeria (Manchester + Chorlton): one Next.js 15 app containing the customer website (`src/app/(site)`), the management dashboard (`src/app/admin`) and the API (`src/app/api`). Business logic lives in `src/lib/platform/`. Prisma + SQLite. See `README.md` and `docs/ARCHITECTURE.md`.

## Setup in a fresh environment
```bash
bash .devcontainer/setup.sh   # npm ci, writes .env with a random admin login, creates + seeds prisma/dev.db
npm run dev                   # http://localhost:3000 (dashboard: /admin, login in CODESPACE-LOGIN.txt)
```
If package installs are blocked in this environment, rely on GitHub Actions (`.github/workflows/ci.yml`): push to a branch and check the run with `gh run list` / `gh run view`.

## Before you finish any change
```bash
npm run typecheck
npm run lint
npm test                      # unit tests in tests/ (Node test runner via tsx)
npm run build
npm start & npm run test:smoke   # end-to-end checks against a running server (needs seeded DB)
```
CI runs all of these on every push; keep it green.

## Rules
- Money is integer **pence**; dates `YYYY-MM-DD`, times `HH:MM`, London time.
- Two branches: `locationId` is `"manchester"` or `"chorlton"`. Dashboard actions must call `assertStaffBranch()`.
- Never trust the browser: customer baskets are re-priced with `priceBasket()`; public references come from `uniqueRef()` (random, never sequential).
- Sessions are signed cookies (`signed-token.ts`); always use `getStaff()` / `getCustomer()`, never read cookie values directly.
- Only sign a visitor in when their customer account was just created (`access.isNew`).
- Demo payments only when `demoPaymentsAllowed()`; real payments go through Stripe.
- **Client components (`"use client"`) must not import server code** (`@/lib/db`, Prisma, `crypto`, `fs`, nodemailer, stripe). Keep browser-safe helpers in files with no server imports (e.g. `money.ts`, `diary.ts`, `src/data/*`); server-only variants live in `refs.ts`, `diary-live.ts`. Breaking this fails `next build`.
- New dashboard actions go in `src/app/api/admin/actions/handlers/<area>.ts`.
- Secrets live in `.env` (never committed); `.env.example` must list every variable the code reads.
- Keep `docs/` up to date when behaviour changes.
