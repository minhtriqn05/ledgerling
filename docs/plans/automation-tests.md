# Ledgerling – Phase 10: Automation and test foundation

Branch: `feature/automation-tests`.

## Goal

Every later phase is built without me checking each step by hand, so the project needs tests that run with one
command and never touch the Atlas database:

- **API tests** (Vitest + Supertest + mongodb-memory-server) for auth, categories, transactions and stats.
- **Client unit tests** (Vitest + React Testing Library + jsdom) for the formatting helpers and `ProtectedRoute`.
- **End-to-end tests** (Playwright) for the main flow, on a desktop and a phone viewport.

No API or page changes its behaviour. A real bug found by a test is fixed and listed in the report.

## Design decisions

- `server/src/app.js` already builds the Express app without connecting or listening (that lives in `server.js`),
  so Supertest imports `app` directly.
- **One in-memory MongoDB per test file.** `tests/setup.js` (Vitest `setupFiles`) starts a `MongoMemoryServer`
  before the file's tests and stops it after. Each file creates its own users and data, so files never share state.
  Vitest runs the files one after another (`fileParallelism: false`) to keep memory use low on a laptop.
- `JWT_SECRET` for tests is set in `vitest.config.js` (`test.env`); `.env` is never read by the tests.
- `tests/helpers.js` holds `registerUser()` (returns token + user) and `auth(token)`, so each test stays short.
- **E2E server:** `server/src/e2e.js` starts a `MongoMemoryServer`, connects Mongoose, sets
  `CLIENT_URL=http://localhost:5174` and listens on port 4100. The app module is imported after the env is set,
  because `app.js` reads `CLIENT_URL` when it is loaded.
- **Playwright:** `webServer` starts both the API (`npm run start:e2e` in /server) and Vite
  (`npm run dev -- --port 5174 --strictPort`). `VITE_API_URL` is passed with the `env` option so it also works on
  Windows (no `VAR=value cmd` syntax). Two projects: `Desktop Chrome` and `Pixel 7`, both run on Chromium.
- Vitest in /client only looks in `src/` (`include: ['src/**/*.test.{js,jsx}']`), so Playwright files in `e2e/`
  are never picked up.

## Checklist

- [x] CLAUDE.md: new sections before `## Git`, new "Plan first" line
- [x] `.git/info/exclude`: `.claude/` and `study/`
- [x] Server: install vitest, supertest, mongodb-memory-server; `npm test`
- [x] Server tests: auth, categories, transactions (month filter at 23:30 on the last day, 409 delete), stats
- [x] Client: install vitest, RTL, jest-dom, user-event, jsdom; jsdom config; `npm test`
- [x] Client tests: `utils/format.js`, `utils/vnDate.js`, `ProtectedRoute`
- [x] Server: `start:e2e` (port 4100, in-memory DB, CORS for 5174)
- [x] Client: @playwright/test, Chromium, `playwright.config.js`, `test:e2e`, ignore Playwright output
- [x] E2E: register → Dashboard → add transaction → Transactions → Dashboard numbers → log out → /transactions → /login
- [x] Run every command under Checks until green
- [x] Report

## Result

- Server: 6 files, 74 tests (auth, categories, transactions, transaction search/export, budgets, stats).
- Client unit: 3 files, 15 tests (`format.js`, `vnDate.js`, `ProtectedRoute`).
- E2E: 1 flow × 2 projects (desktop, mobile) = 2 tests.
- No bug was found in the existing code.
