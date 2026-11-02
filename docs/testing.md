# Testing

Five kinds of checks run on every push (GitHub Actions, [ci.yml](../.github/workflows/ci.yml)), and a sixth checks the
live site after every deploy ([live-smoke.yml](../.github/workflows/live-smoke.yml)). No test ever touches the
production database: the API tests and the end-to-end tests use [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server).

## Latest results

Measured on 3 November 2026 on Windows 11, Node 24.19.0 (the same commands run on Ubuntu 24.04 in CI).

| Check | Command | Result |
|-------|---------|--------|
| Server lint | `cd server && npm run lint` | 0 warnings |
| Server tests | `cd server && npm test` | 39 files, **672 passed** |
| Server coverage | `cd server && npm run test:coverage` | **94.83% lines**, 90.82% branches (fails below 80% lines or branches) |
| Client lint | `cd client && npm run lint` | 0 warnings |
| Client unit tests | `cd client && npm test` | 97 files, **847 passed** |
| Client coverage | `cd client && npm run test:coverage` | **68.36% lines**; `src/utils` 94.0%, `src/hooks` 100% (fails below 60%, or 80% in utils and hooks) |
| i18n | `cd client && npm run i18n:check` | 8 languages, 967 keys each |
| Build | `cd client && npm run build` | OK, PWA precache of 109 entries |
| End-to-end, Chrome | `cd client && npm run test:e2e:chromium` | **337 passed**, 7 skipped (tests written for a phone only or a wide screen only) |
| End-to-end, Firefox + WebKit | `cd client && npm run test:e2e:smoke` | **52 passed** (26 `@smoke` flows × 2 browsers) |

## Server: Vitest + Supertest

`server/tests/` holds 39 files. `tests/setup.js` gives every test file its own empty in-memory MongoDB and builds the
unique indexes first, so duplicates are refused from the first test; Supertest sends real HTTP requests to the Express
app, so the whole chain of middlewares runs.

Every endpoint is tested for **success, 400, 401, 404 for another user's data and 409** where it applies. Besides the
files per resource (`transactions.test.js`, `budgets.test.js` ...) there are cross-cutting suites:

| File | What it proves |
|------|----------------|
| `ownership.test.js` | One table of every route with an id: user A using user B's ids always gets 404 and changes nothing |
| `massAssignment.test.js` | Fields a client must never set (`userId`, `role`, `type`, `savedAmount` ...) are ignored |
| `inputValidation.test.js`, `security.test.js` | MongoDB operators, oversized bodies, rate limits, headers, CORS |
| `dataExposure.test.js` | No answer carries a password hash, a token version or another internal field |
| `concurrency.test.js` | Parallel requests never create two budgets, two default wallets or two recurring transactions for one day |
| `crossCheck.test.js` | Stats, reports, budgets and wallet balances agree with each other on the same data |
| `vietnamTime.test.js` | Month borders at 00:00 +07:00, short months, leap years |
| `indexes.test.js` | The main queries use an index (`explain()`), never a collection scan |
| `apiDocs.test.js` | Routes, Swagger, `docs/api-plan.md`, `docs/erd.md` and the client translations list the same endpoints, codes and fields |
| `realtime.test.js` | Socket.IO events reach only the user's own devices; revoked tokens are disconnected |
| `loginTiming.test.js` | A login with an unknown email takes as long as one with a wrong password |

Run one file: `npx vitest run tests/budgets.test.js` (in `server/`).

## Client: Vitest + React Testing Library

97 test files sit next to the code they test (`Button.test.jsx` beside `Button.jsx`). jsdom stands in for the browser;
`src/test/setup.js` adds the `jest-dom` matchers. The helpers in `src/utils` (formatting, Vietnam dates, CSV, the
quick-add parser) and the hooks in `src/hooks` have the strictest threshold, because they hold the logic.

Run one file: `npx vitest run src/utils/quickAdd.test.js` (in `client/`).

## End-to-end: Playwright

`npm run test:e2e` builds the app, serves it with `vite preview` on port 5174, starts the API on port 4100 with an
in-memory database (`npm run start:e2e` in `server/`) and runs `client/e2e/*.spec.js`:

- **Every test** on Chrome with a desktop viewport and with a Pixel 7 phone viewport.
- **The main flow of each feature**, tagged `@smoke`, also on desktop Firefox and on an iPhone 14 (WebKit).
- `a11y.spec.js` runs axe-core (WCAG 2.1 A and AA rules) on every page in the light and the dark theme, plus the dialogs,
  the drawer, the guided tour and the command palette: no serious or critical issue is allowed.
- `realtime.spec.js` opens two browsers on one account; `offline.spec.js` cuts the network and checks the cached pages
  and the locked writes; `layout-shift.spec.js` checks that pages do not jump while their data arrives.

Install the browsers once: `npx playwright install chromium firefox webkit`. Run one file:
`npx playwright test e2e/budgets.spec.js --project=desktop`. A failed run leaves a report in `client/playwright-report`.

## Live smoke test

`npm run test:e2e:live` (in `client/`, config `playwright.live.config.js`) checks the deployed site: `/api/health` and
its version, Swagger, the app and its security headers, the demo account, the rate limit, and the main flow with one
temporary account that it deletes at the end. The workflow runs it after each push to `main`, once Render serves the new
commit.

## Accessibility and performance audits

The final review ([review/final-review.md](review/final-review.md)) also measured:

- **Lighthouse** (first visit, production build): desktop performance 98 on `/welcome` and the Dashboard; on a throttled
  phone 77 and 67; Accessibility, Best Practices and SEO 100 on every page.
- **axe**: 0 violations of any impact on 28 pages × 2 themes in a one-off sweep.
- **npm audit**: no high or critical advisory; 0 advisories in the client's production dependencies.

## Rules

- A test is never deleted or weakened to make a run green; a test is only changed when the test itself is wrong.
- Every behaviour bug fixed in the final review first got a test that failed.
- Coverage thresholds live in each `vitest.config.js`, so CI fails when they drop.
