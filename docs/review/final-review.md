# Final review – before and after (phase 24)

Branch `feature/final-review`, measured on 2 November 2026 on the machine of the baseline (Windows 11, Ryzen 5 5625U
with 6 cores / 12 threads, Node 24.19.0, npm 11.17.0). The baseline is in [baseline.md](baseline.md), every finding in
[findings.md](findings.md), the step-by-step plan in [../plans/final-review.md](../plans/final-review.md).

## In short

- **39 findings, all fixed**: 2 High, 12 Medium, 25 Low. Each behaviour bug got a test that failed before its fix.
- The rate limits now count the real visitor behind Cloudflare and Render (F-001, confirmed on the live site); the
  share links point to Ledgerling (F-002); bulk actions, the category filter, amounts and dates are checked strictly
  (F-003..F-008); a saved item can no longer vanish from a list (F-038); the offline banner leaves when the network is
  back, in every browser (F-034).
- The end-to-end suite went from 10 random failures in 17.9 min to green three times in a row in about 7.5 min, on the
  production build, and its main flows now also run on Firefox and iPhone Safari.
- New automatic guards: coverage thresholds, ESLint with zero warnings on both sides, a test that compares the routes,
  Swagger, api-plan.md, the ERD and the client translations with the code, a CI workflow with all of it, and a live smoke
  workflow after each deploy of `main`.
- Nothing to configure on Render or Vercel: no new environment variable; `engines` asks for Node 24 on both.

## Before / after

| | Before (baseline) | After |
|-|-|-|
| Server tests (Vitest + Supertest) | 25 files, 594 passed | **38 files, 664 passed** |
| Client unit tests (Vitest + RTL) | 89 files, 759 passed | **96 files, 845 passed** |
| End-to-end, Chrome desktop + phone | 298 tests: 282 passed, **10 failed**, 6 skipped, **17.9 min** (dev server) | 344 tests: **337 passed, 0 failed**, 7 skipped (phone-only / desktop-only), **7.1–7.8 min** (production build), 3 runs in a row green — see [Final runs](#final-runs) |
| End-to-end, Firefox + iPhone Safari (`@smoke`) | – | **52 passed** (26 main flows × 2 browsers), 7.0–7.4 min |
| Server coverage (lines / branches) | 95.22 % / 90.21 % | **94.81 % / 90.75 %** (the run fails below 80 / 80) |
| Client coverage (lines) | 57.16 % (utils 93.7 %, hooks 100 %) | **67.51 %** (utils 94.0 %, hooks 100 %; fails below 60 %, 80 % for utils / hooks) |
| Lint | no ESLint on either side | ESLint (`eslint` + `@eslint/js`), **0 warnings** on both sides |
| i18n | 8 languages × 966 keys | 8 languages × 967 keys, every API error code translated (checked by a test) |
| JavaScript (all files) | 58 files, 1,789.6 kB (575.6 kB gzip) | 64 files, 1,793.0 kB (577.7 kB gzip): the 7 other languages became their own files |
| Biggest chunk | `index` 513.62 kB | `index` **512.88 kB** (≤ baseline) |
| JavaScript of the first page | ≈ 1.15 MB (≈ 370 kB gzip) | **835.6 kB (268.5 kB gzip)** |
| PWA precache | 103 entries, 1,932.6 KiB | 109 entries, 1,940.0 KiB (every language for offline use) |
| axe (serious + critical) | 0 on the pages of `a11y.spec.js` | **0 on every page, light and dark, plus the dialogs, the drawer, the tour, Ctrl+K** (74 checks); 4 issues found and fixed on the way (F-025..F-028) |
| Lighthouse | see [Lighthouse](#lighthouse) | see [Lighthouse](#lighthouse) |
| npm audit (high / critical) | 0 / 0 | **0 / 0** — see [npm audit](#npm-audit) |
| CI | server tests; client lint skipped (no script), unit, build, e2e on the dev server | lint, unit + coverage thresholds, i18n, build, e2e Chrome (all) + Firefox / WebKit (`@smoke`); live smoke after each deploy |

## Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-001 | High | Rate limits count Cloudflare's edge, not the visitor | Fixed |
| F-002 | High | Canonical link, Open Graph and Twitter tags point to another website | Fixed |
| F-003 | Medium | Bulk actions accepted another user's ids | Fixed |
| F-004 | Medium | Filtering by another user's category answered 200 | Fixed |
| F-005 | Medium | Money accepted decimals and numbers far too big | Fixed |
| F-006 | Medium | Days that do not exist were moved to another day | Fixed |
| F-007 | Low | Years outside what the app can report | Fixed |
| F-008 | Low | No upper bound for `page` | Fixed |
| F-009 | Low | The same validation helpers were copied into 12 files | Fixed |
| F-010 | Low | Bulk ids were de-duplicated case-sensitively | Fixed |
| F-011 | Low | `REQUEST_ERROR` has no translation | Fixed |
| F-012 | Low | A database validation error showed Mongoose's own text in production | Fixed |
| F-013 | Low | Login answered faster for an email without an account | Fixed |
| F-014 | Low | No length limit on the email | Fixed |
| F-015 | Low | Start-up and shutdown | Fixed |
| F-016 | Low | The Admin page read whole collections | Fixed |
| F-017 | Low | The monthly report looked up categories by id only | Fixed |
| F-018 | Medium | The end-to-end suite failed at random | Fixed |
| F-019 | Low | Two error-code tests checked nothing | Fixed |
| F-020 | Low | Dead code and a temporary page | Fixed |
| F-021 | Low | Two places called the API without `src/api` | Fixed |
| F-022 | Low | Business logic in controllers, duplicated helpers | Fixed |
| F-023 | Low | No linter; what ESLint found | Fixed |
| F-024 | Medium | Pages jumped while their data arrived (layout shift) | Fixed |
| F-025 | Low | "Skip to content" pointed to an element that does not exist | Fixed |
| F-026 | Medium | Closing a dialog lost the keyboard focus | Fixed |
| F-027 | Medium | The calendar days broke "label in name" (axe: serious) | Fixed |
| F-028 | Low | The 404 page and the error screen had no main heading | Fixed |
| F-029 | Medium | Tablets and small laptops: hidden notes and pages wider than the screen | Fixed |
| F-030 | Low | Landing page header wider than a phone without the web font | Fixed |
| F-031 | Low | Colors written in components instead of tokens.css | Fixed |
| F-032 | Medium | The first visit downloaded all 8 languages and waited for Google Fonts | Fixed |
| F-033 | Low | The progress bar at the top blinked between a page and its data | Fixed |
| F-034 | Medium | The offline banner could stay after the network came back | Fixed |
| F-035 | Low | An index that could not be built failed without a word | Fixed |
| F-036 | Low | The docs did not list every error code, and nothing compared them with the code | Fixed |
| F-037 | Low | The new Firefox and iPhone Safari runs failed because of the test setup | Fixed |
| F-038 | Medium | A saved category, budget or goal could vanish, a deleted rule or budget come back | Fixed |
| F-039 | Low | The "Session expired" test from the Dashboard raced the Dashboard | Fixed |

## Final runs

After the last code change (F-038, F-039), on 2 November 2026:

| Run | Command | Result | Time |
|-----|---------|--------|------|
| 1 | `npm run test:e2e` (Chrome, then Firefox + WebKit) | Chrome 337 passed, 7 skipped; `@smoke` 52 passed | 7.7 + 6.9 min |
| 2 | `npm run test:e2e:chromium` | 337 passed, 7 skipped | 7.5 min |
| 3 | `npm run test:e2e:chromium` | 337 passed, 7 skipped | 7.4 min |

Before that last change the suite had also passed three times in a row (P5.2: 7.1 / 7.2 / 7.3 min); the first final
round then showed one failure in each of two runs, which led to F-038 (an app bug) and F-039 (a test bug). The 7
skipped tests are the ones written for a phone only or a wide screen only.

Same day: server `npm run lint` 0 warnings, `npm test` 664 passed, `npm run test:coverage` 94.81 % / 90.75 % (thresholds
met); client `npm run lint` 0 warnings, `npm run i18n:check` OK, `npm test` 845 passed, `npm run test:coverage` 67.51 %
(thresholds met), `npm run build` OK; live checks (P5.7) and the deploy rehearsal (P5.8) as in the plan.

## Lighthouse

Build served by `vite preview`, API of the end-to-end tests, Lighthouse 12 run from Node (mobile = default throttling,
desktop = desktop preset), each page as a **first visit**: no service worker, no Cache Storage, no HTTP cache. The
Dashboard is signed in as the demo account.

| Page | Before (1 Nov) | After (2 Nov) |
|------|----------------|---------------|
| /welcome, mobile | Perf 77, A11y 100, BP 100, SEO 100 (FCP 2.2 s, LCP 5.3 s) | Perf **77**, A11y 100, BP 100, SEO 100 (FCP **1.2 s**, LCP 5.3 s, TBT 140 ms) |
| /welcome, desktop | 97 / 100 / 100 / 100 | **98** / 100 / 100 / 100 |
| Dashboard, mobile | not measured (see below) | Perf **67**, A11y 100, BP 100, SEO 100 (FCP 1.2 s, LCP 5.5 s, TBT 480 ms) |
| Dashboard, desktop | not measured | **98** / 100 / 100 / 100 |

- Accessibility, best practices and SEO are 100 on every page and preset; desktop performance is 98.
- **Mobile performance stays under 90**, and the reason is the same on both pages: the app draws everything with
  JavaScript. On /welcome the largest element is the screenshot of the hero, which the browser only learns about once
  the JavaScript has run (Lighthouse: "request is not discoverable in the initial document"), so the first paint got
  faster (2.2 s → 1.2 s, F-032) but the largest one did not. The Dashboard also waits for its data and for 2.1 s of
  main-thread work on a 4× slower CPU (TBT 480 ms). Getting over 90 needs the landing page written into the HTML
  (prerender or server rendering) and a lighter chart library: changes of the architecture, not of a feature freeze.
- Correction: the earlier numbers of this review (/welcome 93, Dashboard 86 in the P4 notes and in F-032) were taken
  with the service worker of an earlier visit still installed, so the app came from its cache; and the "Dashboard
  before" file had in fact measured /welcome, because that first runner lost the session. They were replaced by the
  first-visit numbers above.

## npm audit

| Folder | All dependencies | Production only |
|--------|------------------|-----------------|
| Server | 8 moderate (baseline 4) | 3 moderate (baseline 3) |
| Client | 2 low + 12 moderate (baseline 2 + 8) | 0 (baseline 0) |

No high or critical. The new entries are ESLint and `@eslint/js` (development only, added in P3), through the same
`minimatch` advisory as before. The production ones are `swagger-jsdoc` → `glob` → `minimatch`, which reads the route
files of the project once at start-up, never user input. npm offers no fix except `npm audit fix --force`, which would
install much older majors (`eslint@4`, `swagger-jsdoc@6.2.8`, `vite-plugin-pwa@1.1.0`), so nothing was forced.

## Deploy

- `npm ci` from scratch in a clean copy, the server with production packages only, `NODE_ENV=production npm start`
  on an in-memory database, the client built and served by `vite preview`: health, `/api-docs`, deep links, CORS, rate
  limits, the demo seed and the main flow all worked (P5.8).
- `engines.node` is `24.x` in both packages, so Render and Vercel use the Node version of the tests and the CI.
- `client/vercel.json` keeps the SPA rewrite and adds `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`
  and `Permissions-Policy` (no CSP: the app loads Google Fonts and talks to the API on another domain, a mistake there
  would break the live site).
- `GET /api/health` answers the deployed commit (`version`); the live smoke workflow waits for it, checks Vercel and runs
  `npm run test:e2e:live`, which also checks this branch's own changes once they are live (the version, the headers of
  `vercel.json`, the rate limit with one connection per request).

## Remaining risks

1. **The live site runs the old code until this branch is merged.** F-001 was confirmed there on 2 November (one visitor,
   two rate-limit counters). The live smoke workflow checks the fix after the deploy; if Render ever changes its proxy
   chain, that check fails.
2. **Rate limits per IP address**: a class on one Wi-Fi shares one counter (300 API requests / 15 min, 20 logins /
   15 min). A live demo in front of many students on the same network could see "Too many requests".
3. **Deleting a category at the very moment a transaction is created for it** on another device can leave that
   transaction with a category that no longer exists (two requests in the same few milliseconds; found in P2, not fixed
   because it needs a transaction across two collections).
4. **Lighthouse performance on a phone is 77 (/welcome) and 67 (Dashboard)**, under the 90 asked for: the pages are
   drawn by JavaScript (about 270 kB compressed for the first page), so the largest paint waits for it on a slow 4×
   CPU. Going over 90 needs prerendering or server rendering and a lighter chart library, which is out of the scope of
   a feature freeze. Desktop is 98, accessibility, best practices and SEO are 100.
5. **Passwords are limited to 72 characters, not 72 bytes**: bcrypt only reads the first 72 bytes, so a very long password
   written with many accents or emoji is cut silently.
6. **WebKit runs with reduced motion** in the end-to-end tests (Playwright's WebKit has no GPU, F-037); the full
   animations are tested on Chrome and Firefox only.
7. **Render's free plan sleeps**: the first visit after 15 quiet minutes waits up to a minute (the app says so).
8. The animation library prints a development-only warning when the device asks for reduced motion; it is not in the
   production build.
