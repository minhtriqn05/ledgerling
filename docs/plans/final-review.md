# Plan: Final review and clean-up (phase 24)

Branch: `feature/final-review`. Feature freeze: only find bugs, fix them and raise the quality of what exists.
Findings go to `docs/review/findings.md` (F-001...), the baseline to `docs/review/baseline.md`, the closing
report to `docs/review/final-review.md`. Tick each box when it is done, so the phase can be resumed in a new chat.

Live (found from the GitHub repo homepage and the bundle; CLAUDE.md only has placeholders):
- Frontend: https://ledgerling-ten.vercel.app
- API: https://ledgerling-api.onrender.com/api (health `/api/health`, docs `/api-docs`)

Rules kept all the way: no git command except status / diff / log / grep; Atlas is never written (tests and local runs
use the in-memory e2e database), except P5.7 (one temporary account on the live API, deleted right after) and P5.8
(seed the demo only if the live demo answers 503); no new required env variable; no major upgrades; a behaviour bug
gets a failing test first; no test is deleted, skipped or weakened; no eslint-disable or coverage-ignore comments.

## P0 – Baseline (before any fix)
- [x] Add `test:coverage` (server + client, `@vitest/coverage-v8` 5.0.5, same version as vitest)
- [x] Server: `npm test`, `npm run test:coverage`, `npm audit`
- [x] Client: `npm test`, `npm run test:coverage`, `npm run build` (chunk sizes), `npm run i18n:check`, `npm audit`
- [x] Client: `npm run test:e2e` (time, pass/fail), axe violations count
- [x] Write `docs/review/baseline.md`

## P1 – Security and access control
- [x] 1. Ownership table test: every route of every model, user A on user B's data → 404 (also B's ids in bodies) — `tests/ownership.test.js`, F-003, F-004
- [x] 2. Mass assignment: no body can write userId, role, status, tokenVersion, passwordHash, savedAmount, isDefault... — `tests/massAssignment.test.js` (no defect)
- [x] 3. Roles: admin 403 / 401, demo 403 on the blocked actions, disabled account, old token after password / logout-all — already covered by admin / demo / settings / realtime tests
- [x] 4. No leaks: no passwordHash in any answer (admin, export, populate, errors); production errors without internals — `tests/dataExposure.test.js`, F-012
- [x] 5. Input: types, regex escaping, page/limit, string lengths, invalid dates / ids → 400 (never 500), avatar, CSV injection, 500-row import — F-005..F-008, F-010, F-014; login timing F-013
- [x] 6. Infrastructure: CORS list, helmet, rate limits, trust proxy, body limits, JWT expiry, bcrypt cost, required env check at start — F-001, F-015 (`config/env.js`, health `version`)
- [x] 7. Socket.IO: no / old token refused, rooms per user, logout-all disconnects — already covered by `tests/realtime.test.js`
- [x] 8. Secrets in git history (`git log --all`), report only — nothing found (only empty `.env.example` values and test placeholders)

Done so far inside P1/P2 (keep for the docs step): F-001 trust proxy 2; F-005/F-006/F-007/F-008 shared
`server/src/utils/validation.js` (whole VND, real days, 1970–2100, page ≤ 100,000) mirrored in the client
(`utils/validators.js` `isWholeAmount`, `utils/vnDate.js` `isAppDay`, `csvImport.js`); translations AMOUNT_INVALID,
WALLET_BALANCE_INVALID, REQUEST_ERROR. **Still to document**: Swagger + api-plan.md for bulk 404, categoryId filter 404,
amount rules, date rules, page max.

## P2 – Data correctness
- [x] 1. Vietnam time (UTC+7) everywhere; boundary tests (23:30 on the last day, the 31st, leap year) — `tests/vietnamTime.test.js` + existing
- [x] 2. Money: whole VND everywhere; Dashboard = Reports = Budgets for one month (cross-check test) — F-005, `tests/crossCheck.test.js`
- [x] 3. Concurrency: recurring, goal contributions, notifications, bulk — `tests/concurrency.test.js` + existing
- [x] 4. Cascades: category delete; account delete empties every collection; no orphans — `tests/cascade.test.js` + existing (race orphan = remaining risk)
- [x] 5. Query performance: indexes (explain), no N+1, lean() + projection on read-only queries — F-016, F-017, `tests/indexes.test.js`
- [x] 6. One format for success / error, right status codes, every error code translated in the client — F-011

## P3 – Code quality
- [x] 1. Layers: routes declare, controllers do req/res, services hold the logic, models are schemas; client calls the API only through `src/api` — F-021, F-022
- [x] 2. Clean-up: dead code, unused files / components, temporary pages (/brand, /style-guide...), console.log, old TODOs, duplicates, unused packages (`npx depcheck`), unused assets — F-020, F-022 (depcheck: nothing unused)
- [x] 3. Lint: ESLint (eslint + @eslint/js) with a `lint` script in server and client, zero warnings — F-019, F-023
- [x] 4. React: no console warnings; every effect cleans up; socket refreshes debounced; API cache cleared on logout — dev-server sweep of every page: 0 warnings; unit tests: 0 React warnings
- [x] 5. Names, folders and comments consistent, in English

E2E infrastructure (F-018): the suite now runs on the production build (`vite preview` on 5174, service worker blocked
except `offline.spec.js`). Third run: 290 passed + 2 (the chart test, fixed after) in 7.7 min.

## P4 – Frontend: UX, accessibility, i18n
- [x] 1. No hard-coded UI text; i18n:check clean; no Vietnamese in API messages; long German / CJK text does not break layouts — scan clean; layout sweep 8 languages × 5 widths → F-029, F-030
- [x] 2. Loading (skeleton), empty, error and offline states on every page and Settings section; forms validate, lock while sending, autocomplete right — checked page by page; Danger zone `new-password` + form `off`
- [x] 3. axe on every page, light and dark: no serious / critical; keyboard; focus trap + Esc in modal, drawer, Ctrl+K; visible focus; reduced motion — `e2e/a11y.spec.js` (every page + dialog + drawer, 74 green), `e2e/keyboard.spec.js`; F-025..F-028
- [x] 4. Only tokens.css colours / fonts / spacing; check 390, 768, 1024, 1440 px, light and dark — F-031; widths by the layout sweep (F-029), themes by axe light + dark
- [x] 5. Performance: route code splitting, biggest chunk <= baseline, Lighthouse (/welcome, Dashboard) >= 90 x4 — F-032, F-024; first visit: desktop 98 / 98, mobile 77 (/welcome) and 67 (Dashboard) under 90, reason in final-review.md; a11y / BP / SEO 100
- [x] 6. PWA: valid manifest, installable, SW update, offline data — manifest complete (192/512 + maskable, standalone), skipWaiting + clientsClaim, languages precached, `offline.spec.js`

P4 progress notes: hard-coded text scan of every JSX file = clean (only the brand name and "₫"); dates / numbers all
through `utils/format.js`. Performance work done: 7 languages loaded on demand (i18next backend in `src/i18n/index.js`,
English bundled; `main.jsx` waits for a saved language; test setup preloads all), Google Fonts stylesheet no longer
render-blocking (`index.html`), `registerSW.js` deferred (`injectRegister: 'script-defer'`), hero image
`fetchPriority="high"`, F-002 site address (`scripts/siteAddress.js`). Lighthouse before: /welcome mobile 77 / desktop 97,
a11y / best practices / SEO 100 (scratchpad script `lighthouse-run.mjs`; the Dashboard run needs a signed-in profile).
Layout shift fixed (F-024: mobile grid rows, footer below the fold, aurora blob via translate, Transactions totals
placeholders, wallet filter always shown; test `e2e/layout-shift.spec.js`). Skip-link target `id="main"` on every
<main> (F-025). Lighthouse: the 93 / 86 first noted here were measured with a service worker still installed; the
first-visit numbers (final-review.md) are /welcome 77 mobile / 98 desktop, Dashboard 67 / 98, a11y / BP / SEO 100.

## P5 – Tests, docs, deploy, live
- [x] 1. Coverage thresholds (server 80% lines + branches; client 60% lines, src/utils + hooks 80%) — set in both
  `vitest.config.js`; server 94.8% lines / 90.7% branches (653 tests), client 62.6% lines, utils 93.8%, hooks 100% (840 tests)
- [x] 2. E2E: one main flow per feature, desktop + mobile; @smoke tag; Firefox + WebKit projects for @smoke; full Chromium run 3 times green
  — `e2e/categories.spec.js` (new), 26 tests tagged `{ tag: '@smoke' }` (one main flow per feature), projects
  `firefox` (Desktop Firefox) + `webkit` (iPhone 14, reduced motion), one worker each, `isPhone()` helper; smoke 52/52
  in 7.0 min (F-034, F-037); Chromium 3 runs in a row: 337 passed + 7 skipped (phone-only / desktop-only), 7.1 / 7.2 /
  7.3 min
- [x] 3. CI: lint, unit, coverage, i18n, build, e2e (Chromium full, Firefox / WebKit @smoke); live-smoke workflow on main (health `version`, wait for deploy, Vercel 200, `test:e2e:live`); CLAUDE.md Checks
  — `.github/workflows/ci.yml` (server, client, e2e matrix), `.github/workflows/live-smoke.yml`, `playwright.live.config.js`
  + `e2e/live/site.live.js` (checked on the local stack: 4/4 that can run there), scripts `test:e2e:chromium`,
  `test:e2e:smoke`, `test:e2e:live`; CLAUDE.md Checks + Live URLs (CLAUDE.md is git-ignored)
- [x] 4. Docs: Swagger for every route with examples and error codes; api-plan.md = code (automatic route check); erd.md Mermaid erDiagram
  — F-036, `tests/apiDocs.test.js` (9 checks), F-035 (index errors logged)
- [x] 5. Screenshots (seeded e2e data) to `docs/screenshots/` — `npm run screenshots:docs` (`e2e/docs-screenshots.capture.js`):
  15 pages at 1440 and 390 px (light) + Dashboard dark / Deutsch / 日本語 = 35 JPEG, 3.2 MB; checked by eye
- [x] 6. README.md rewritten — English: name, course, live links + demo, features by area, screenshots, stack, Mermaid
  architecture, local run, tests with coverage, CI + live smoke badges, security, Render / Vercel variables (checked
  against the code), folder structure; both `.env.example` complete (`VITE_SITE_URL`, `RENDER_GIT_COMMIT` noted)
- [x] 7. Live: health, /api-docs, Vercel 200; `test:e2e:live` with a temporary account deleted by DELETE /api/users/me
  — curl: health 200 (old code: no `version` yet), `/api-docs/` 200, Vercel `/` and `/transactions` 200. `test:e2e:live`
  without the 2 checks of this branch's own changes (health `version`, Vercel headers): 4/4, the temporary account made
  through the API, used in the UI and deleted (its login then answers 401). The stricter rate-limit check (one connection
  per request) fails on the old code as F-001 predicts (295 expected, 277 received); live-smoke checks all 6 after the merge
- [x] 8. Deploy rehearsal: `npm ci`, `NODE_ENV=production npm start`, build + preview; `engines`; vercel.json headers; demo 200
  — in a clean copy (no `.env`, no node_modules): server `npm ci --omit=dev` (4 s) + `npm run seed` + `NODE_ENV=production
  npm start` on an in-memory MongoDB (never Atlas), client `npm ci` (15 s) + build + `vite preview`: health `version`,
  /api-docs, deep links 200, CORS with a trailing-slash CLIENT_URL, rate limits on, helmet; `test:e2e:live` against it
  4/4. `engines.node` "24.x" in both packages (Render and Vercel read it; CI and local use 24); `vercel.json` keeps the
  SPA rewrite + X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy (no CSP). Live demo 200,
  no seed needed.

## Finish
- [x] Everything again: Checks, lint, coverage with thresholds, i18n, build, audit, e2e Chromium x3, @smoke Firefox + WebKit
  — the first final round found F-038 / F-039; after their fix: `npm run test:e2e` (337 + 52), Chromium 337 × 2 more,
  server 664, client 845, both lints 0, coverage met, i18n OK, build OK, audit 0 high / critical; Lighthouse first visit
- [x] `docs/review/final-review.md` (before / after table, findings, remaining risks)
- [x] Stop every server; short report in Vietnamese
