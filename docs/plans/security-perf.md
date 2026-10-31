# Plan: Security, performance and CI (phase 20)

Branch: `feature/security-perf`.

Done when: every protection layer has a test, the first page loads less JavaScript, and the CI file runs the tests and the build.

## Decisions
- Libraries: `helmet`, `compression`, `express-rate-limit` (all allowed in CLAUDE.md). No `express-mongo-sanitize` (does not work with Express 5).
- Middleware order in `app.js`: `trust proxy` → helmet → compression → cors → rate limit → body parser → routes.
- Helmet runs for every route. `/api-docs` gets its own, looser Content-Security-Policy (Swagger UI needs inline scripts and styles), set on that router only.
- Rate limit: `/api` 300 requests / 15 min / IP, `/api/auth/login` + `/api/auth/register` 20 / 15 min / IP. The answer is 429 `{ success: false, message, code: "RATE_LIMITED" }`.
  Skipped when `NODE_ENV=test` (Vitest sets it) unless the app is made with `createApp({ rateLimit: true })`, which the rate-limit test uses.
  Playwright's API (`start:e2e`) is not in test mode, so `e2e.js` sets `RATE_LIMIT_OFF=true` (the E2E suite makes hundreds of requests from one IP).
- Body limit: 100 kB for every route. The CSV import (`POST /transactions/import`, up to 500 rows) keeps 300 kB with its own parser, because 500 rows with 200-character notes are bigger than 100 kB.
  Too big = 413 `{ success: false, message, code: "PAYLOAD_TOO_LARGE" }`.
- Error handler: never sends a stack trace (it never did); also logs less in production and maps `entity.too.large`.
- NoSQL injection, two layers:
  1. Every validator already turns the fields it reads into the right type; the audit found query values that were checked with `regex.test()` (which turns an array into a string). They are now checked as strings.
  2. A small guard `rejectOperators` (middlewares/sanitizeInput.js) runs on `/api`: it answers 400 `INVALID_INPUT` for a body key that starts with `$` or has a `.`, and for a query key that starts with `$` or has `[`, or a query value that is not a single string. `query parser` is set to `simple` explicitly.
- Indexes added: Budget `{ userId, month }`, Notification `{ userId, createdAt: -1 }`, Transaction `{ userId, categoryId, date: -1 }`.
- `lean()` + `select` only where the document is read internally and never sent to the client (the models have `toJSON` transforms that lean results would skip).
- Client: `React.lazy` + `Suspense` per route page; Recharts then loads only with Dashboard / Reports. Bundle size before: **1,405.17 kB JS (423.81 kB gzip)** in one file.
- CI: `.github/workflows/ci.yml`, jobs `server` and `client`, on push and on pull requests to `main`.
- `npm audit`: both folders, `npm audit fix` only without `--force`.

## Checklist
### Server
- [x] Read the code, audit validators and queries
- [x] `npm i helmet compression express-rate-limit`
- [x] `app.js`: trust proxy, helmet, compression, rate limits, body limit, Swagger CSP
- [x] `middlewares/rateLimit.js`, `middlewares/sanitizeInput.js`, error handler (413, 429, production)
- [x] Strict string checks for query values (month, currency, year, categoryId)
- [x] Indexes, `lean()` / `select` on internal reads
- [x] `.env.example` and `docs/api-plan.md` (429, 413, `INVALID_INPUT`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`), Swagger responses
- [x] Tests: security headers, 429, `$ne` on login = 400, 413, query/body operators, production error body
### Client
- [x] `React.lazy` + `Suspense` in `App.jsx` (fallback uses the existing loading state)
- [x] Translations for the new error codes in all 8 locale files
- [x] Bundle size after, `npm audit` in both folders
- [x] Playwright / Vitest still green
### CI
- [x] `.github/workflows/ci.yml`
### Checks
- [x] `server`: `npm test`
- [x] `client`: `npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check` (no `lint` script exists)
- [x] Report in Vietnamese

## Result
- Server tests: 499 passed (24 new in `tests/security.test.js`).
- Bundle (`npm run build`): before one file of 1,405.17 kB (gzip 423.81 kB). After: the first page downloads about 851 kB (gzip 268 kB); Recharts (about 330 kB) is a separate file loaded with the Dashboard / Reports.
- `npm audit`: client 0 in dependencies that run in the browser (10 in build tools, need `--force`); server 3 moderate (`swagger-jsdoc` > `glob` > `minimatch`, need `--force` = breaking downgrade), 1 more in `nodemon` (dev). Nothing was forced.
- Not done on purpose: loading the 8 language files on demand (i18n is initialised synchronously, `initAsync: false`).
