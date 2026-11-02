# Final review – findings

Every finding below was reproduced (by a test, a request or by reading the code) before it was fixed.
Severity: **Critical** (data loss / account takeover), **High** (security or a production feature broken), **Medium**
(wrong behaviour a user can hit), **Low** (stability, consistency, clean-up). Every finding of Medium or above is fixed.

| ID | Severity | Where | Status |
|----|----------|-------|--------|
| F-001 | High | `server/src/app.js` (trust proxy) | Fixed |
| F-002 | High | `client/vite.config.js` (site address) | Fixed |
| F-003 | Medium | `server/src/services/transactionService.js` (bulk) | Fixed |
| F-004 | Medium | `server/src/services/transactionService.js` (category filter) | Fixed |
| F-005 | Medium | `server/src/middlewares/validate*.js` (money) | Fixed |
| F-006 | Medium | `server/src/middlewares/validateTransaction.js`, `validateWallet.js` (dates) | Fixed |
| F-007 | Low | `server/src/middlewares/validate*.js` (years) | Fixed |
| F-008 | Low | `server/src/middlewares/validate*.js` (page) | Fixed |
| F-009 | Low | `server/src/middlewares/validate*.js` (duplicated helpers) | Fixed |
| F-010 | Low | `server/src/middlewares/validateTransaction.js` (bulk ids) | Fixed |
| F-011 | Low | `client/src/locales/*.json` (`REQUEST_ERROR`) | Fixed |
| F-012 | Low | `server/src/middlewares/errorHandler.js` (Mongoose message) | Fixed |
| F-013 | Low | `server/src/services/authService.js` (login timing) | Fixed |
| F-014 | Low | `server/src/middlewares/validateAuth.js` (email length) | Fixed |
| F-015 | Low | `server/src/server.js`, `config/origins.js` (start-up) | Fixed |
| F-016 | Low | `server/src/models/Transaction.js`, `User.js` (admin indexes) | Fixed |
| F-017 | Low | `server/src/services/reportService.js` (category lookup) | Fixed |
| F-018 | Medium | `client/playwright.config.js`, `client/e2e/*` (flaky e2e) | Fixed |
| F-019 | Low | `server/tests/errorCodes.test.js` (weak assertions) | Fixed |
| F-020 | Low | `client/src` (dead code, temporary page) | Fixed |
| F-021 | Low | `client/src/context/AuthContext.jsx`, `ApiStatus.jsx` (API layer) | Fixed |
| F-022 | Low | `server/src/controllers/*` (logic in controllers, duplicates) | Fixed |
| F-023 | Low | server + client (no ESLint; what it found) | Fixed |
| F-024 | Medium | `client/src/components/AppLayout`, `Aurora`, `pages/TransactionsPage.jsx` (layout shift) | Fixed |
| F-025 | Low | `client/src` (skip link target) | Fixed |
| F-026 | Medium | `client/src/components/Modal`, `Drawer`, `Tour` (focus after closing) | Fixed |
| F-027 | Medium | `client/src/pages/reports/CalendarTab.jsx` (label in name, axe serious) | Fixed |
| F-028 | Low | `client/src/components/FullPageMessage` (404 without h1) | Fixed |
| F-029 | Medium | `client/src/pages/transactions`, `reports`, `recurring`, `wallets` (layouts next to the sidebar) | Fixed |
| F-030 | Low | `client/src/pages/WelcomePage.module.css`, `Logo` (phone header without web fonts) | Fixed |
| F-031 | Low | 20 CSS modules + `DashboardCharts.jsx` (colors outside tokens.css) | Fixed |
| F-032 | Medium | `client/src/i18n`, `index.html`, `vite.config.js` (first load on a phone) | Fixed |
| F-033 | Low | `client/src/hooks/useTopProgress.js` (progress bar blink) | Fixed |
| F-034 | Medium | `client/src/hooks/useOnline.js` (offline banner stays) | Fixed |
| F-035 | Low | `server/src/config/db.js` (index build fails silently) | Fixed |
| F-036 | Low | Swagger comments, `config/swagger.js`, `docs/api-plan.md`, `docs/erd.md` (docs vs code) | Fixed |
| F-037 | Low | `client/playwright.config.js`, `client/e2e/*` (Firefox / WebKit runs) | Fixed |
| F-038 | Medium | `client/src/pages/CategoriesPage.jsx`, `BudgetsPage.jsx`, `GoalsPage.jsx`, `RecurringPage.jsx` (old list answer) | Fixed |
| F-039 | Low | `client/e2e/ux-polish.spec.js` (Session expired test raced the Dashboard) | Fixed |
| F-040 | High | `server/src/middlewares/rateLimit.js`, `server/src/app.js` (visitor address, F-001 again) | Fixed (live check after the deploy) |
| F-041 | Medium | `client/playwright.config.js` (WebKit admin test ran out of time on the CI) | Fixed |
| F-042 | Low | `client/src/components/Tour/Tour.jsx` (card drawn at the last step's place for a frame) | Fixed |
| F-043 | Low | `.github/workflows/*.yml` (actions on Node 20, moving `ubuntu-latest`) | Fixed |

---

### F-001 – High – Rate limits count Cloudflare's edge, not the visitor
- **Where**: `server/src/app.js:41` (`app.set("trust proxy", 1)`).
- **What**: on Render a request goes through Cloudflare and then Render's own proxies. With one trusted hop, `req.ip`
  is an address of that path, which changes from request to request and is shared by unrelated visitors. The
  300 / 15 min API limit and the 20 / 15 min login, register and demo limits were therefore shared between strangers
  (one busy visitor could lock others out), while one visitor's login attempts were spread over several counters.
- **Reproduce (live)**: 12 requests in a row from one IPv4 address to `GET /api/auth/me` answered
  `ratelimit-remaining` 295, 295, 294, 293, 292, 291, 294, 293, **299 (reset 900)**, 290, 289, 292: three counters with
  three reset times for one visitor.
- **First fix (wrong)**: `trust proxy` = 2, on the guess that `X-Forwarded-For` arrives as `visitor, cloudflare-edge`.
  The live smoke run after the deploy (run 41457585854) disproved it: the counter still jumped. The real fix is F-040.
  The live smoke check (`npm run test:e2e:live`) checks after each deploy that consecutive requests share one counter.
- **Re-checked on 2 November 2026** (the live site still runs the old code): `e2e/live/site.live.js` opens a new
  connection for each request (this computer has no IPv6, so it is always one address); within the first five requests
  one answered `ratelimit-remaining` 277 where the counter of the first request had to show 295: a second counter. The
  first version of that check reused one connection, kept the same Cloudflare address and passed even on the old code,
  which is why it now opens a connection per request.

### F-002 – High – Canonical link, Open Graph and Twitter tags point to another website
- **Where**: `client/vite.config.js:18` (default `https://ledgerling.vercel.app`).
- **What**: `VITE_SITE_URL` is not set on Vercel, so the built `index.html` says `<link rel="canonical"
  href="https://ledgerling.vercel.app/">`. That address belongs to an unrelated Next.js app ("Ask your bank statement
  questions"). Search engines are told the page lives there, and link previews load `og-image.png` from that site.
- **Reproduce**: `curl -s https://ledgerling-ten.vercel.app/ | grep canonical` and `curl -sL https://ledgerling.vercel.app/`.
- **Fix**: the address is taken from Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` at build time, with
  `https://ledgerling-ten.vercel.app` (the project's address, also the GitHub homepage) as the fallback. Nothing has to
  be set on Vercel.

### F-003 – Medium – Bulk actions accepted another user's ids
- **Where**: `server/src/services/transactionService.js` (`bulkDeleteTransactions`, `bulkChangeCategory`).
- **What**: ids of other users were skipped with `200 { deleted: 0 }`, and a list mixing the caller's ids with someone
  else's still deleted / moved the caller's rows. The rule of the project is 404 for any id of another user.
- **Reproduce**: `tests/ownership.test.js` ("bulk-delete B's transaction", "bulk-delete mine and B's together",
  "bulk-move B's transaction to my category") answered 200 and A's own transaction was deleted.
- **Fix**: all or nothing: when one id is not a transaction of the user (another user's or unknown) the answer is
  404 `TRANSACTION_NOT_FOUND` and nothing changes. Both cases give the same answer, so nothing leaks.
  `tests/transactionBulk.test.js` had three tests written for the old rule (200 + skip); they now expect the 404 and
  also check that the caller's own rows were not touched (stricter, not weaker). Swagger and `docs/api-plan.md` updated.

### F-004 – Medium – Filtering by another user's category answered 200
- **Where**: `server/src/services/transactionService.js` (`buildFilter`), used by `GET /transactions` and `GET /transactions/export`.
- **What**: `?categoryId=<id of another user>` gave an empty list / empty file with 200, while `?walletId=` of another
  user already gave 404. Fixed to 404 `CATEGORY_NOT_FOUND`, like every other reference to someone else's data.
- **Reproduce**: `tests/ownership.test.js` ("filter my list by B's category", "export with B's category").

### F-005 – Medium – Money accepted decimals and numbers far too big
- **Where**: the amount checks of transactions, CSV import rows, budgets, templates, recurring rules, transfers and the
  wallet starting balance (`validateTransaction.js`, `validateBudget.js`, `validateTemplate.js`, `validateRecurring.js`,
  `validateWallet.js`). Goals already required whole VND up to 999,999,999,999.
- **What**: `1000.5`, `0.000001`, `1e13` and even `1e300` were saved. Sums of decimals have rounding errors, the forms
  can never show such amounts, and a `1e300` expense broke the budget notification
  (`Notification validation failed: message ... "Food has used 1e+290% ..."` in the server log).
- **Reproduce**: `tests/inputValidation.test.js` "money is whole VND" (red: 201 on every route).
- **Fix**: one `checkAmount` in `server/src/utils/validation.js`: a JSON number, whole, from 1 to 999,999,999,999
  (the 12 digits the amount boxes allow). Existing documents are not touched (the schemas did not change).

### F-006 – Medium – Days that do not exist were moved to another day
- **Where**: the ISO date check of transactions, transfers and CSV rows written in ISO format.
- **What**: `new Date("2026-02-30T10:00:00Z")` is 2 March, so a transaction dated 30 February was saved on 2 March
  without an error (31 April → 1 May, 29 February 2025 → 1 March).
- **Reproduce**: `tests/inputValidation.test.js` "days that do not exist..." (red: 201).
- **Fix**: `checkIsoDate` checks that the `YYYY-MM-DD` part is a real day before reading the moment.

### F-007 – Low – Years outside what the app can report
- **What**: dates in year 0100 or 9999 were accepted, while the yearly report only accepts 1970–2100 (and a date in
  year 9999 + 7 hours turns into "+010000-..." in `vietnamDay`). Every day and date is now checked against 1970–2100
  (`MIN_YEAR` / `MAX_YEAR`, shared with the yearly report).

### F-008 – Low – No upper bound for `page`
- **What**: `?page=99999999999999999999` made MongoDB skip 1e21 documents (200 with an empty list) on
  `/transactions`, `/transfers` and `/notifications`. Pages now go up to 100,000 (400 above).

### F-009 – Low – The same validation helpers were copied into 12 files
- **What**: `text`, `OBJECT_ID_REGEX`, `checkAmount`, `checkNote`, `checkDay`, `checkColor`, the name checks, the
  `page` / `limit` parsing and the "malformed id = 404" middlewares were written again in each validator, which is how
  the amount rules drifted apart (F-005). They now live once in `server/src/utils/validation.js`; messages and codes
  are unchanged.

### F-010 – Low – Bulk ids were de-duplicated case-sensitively
- **What**: `"6720…AB"` and `"6720…ab"` are the same ObjectId but were counted as two ids. With the all-or-nothing
  check of F-003 that would answer 404 for a valid request. Ids are now lower-cased before duplicates are removed.

### F-011 – Low – `REQUEST_ERROR` has no translation
- **What**: `errorHandler` gives `REQUEST_ERROR` to an unusual 4xx (for example 415 for an unsupported charset), and
  the client has no `errors.REQUEST_ERROR`, so the English message was shown in every language.
- **Fix**: `errors.REQUEST_ERROR` in the 8 languages. A script compared every code the server can throw with
  `client/src/locales/en.json`: this was the only one missing. The amount messages (`AMOUNT_INVALID`,
  `WALLET_BALANCE_INVALID`) were rewritten for the whole-VND rule of F-005 in every language.

### F-012 – Low – A database validation error showed Mongoose's own text in production
- **Where**: `server/src/middlewares/errorHandler.js:22`.
- **What**: a `ValidationError` was answered with `err.message` ("Notification validation failed: type: \`nope\` is not
  a valid enum value for path \`type\`"), which names models, paths and values. The request validation normally stops
  bad input first, but F-005 showed it can still happen.
- **Reproduce**: `tests/dataExposure.test.js` "error handler in production" (red: the Mongoose text was returned).
- **Fix**: in production the message is "Invalid input" (code `VALIDATION_ERROR`); in development the details stay.
  The same file checks that no answer of ~30 routes (admin included) holds `passwordHash`, `tokenVersion`, a bcrypt hash,
  `userId`, `__v`, `dedupeKey` or a stack trace.

### F-013 – Low – Login answered faster for an email without an account
- **Where**: `server/src/services/authService.js` (`login`).
- **What**: the message was the same for an unknown email and a wrong password, but bcrypt only ran for a known email,
  so the answer time told which emails are registered.
- **Reproduce**: `tests/loginTiming.test.js` (red: 0 bcrypt comparisons for an unknown email).
- **Fix**: an unknown email is compared with a fixed hash, so both cases do the same work.

### F-014 – Low – No length limit on the email
- **What**: register and login accepted an email of ~100 kB (only the body limit stopped it). Now at most 254
  characters (`EMAIL_INVALID`). Test: `tests/inputValidation.test.js` "text lengths".

### F-015 – Low – Start-up and shutdown
- **What**: (1) only `JWT_SECRET` and `MONGODB_URI` were checked at start: without `CLIENT_URL` every browser request
  was blocked by CORS without any message, and a wrong `JWT_EXPIRES_IN` made every login fail with 500.
  (2) `CLIENT_URL=https://x.vercel.app/` (trailing slash) never matched the browser's Origin. (3) Render's `SIGTERM`
  before a new deploy cut the requests on their way.
- **Fix**: `server/src/config/env.js` lists every problem and `server.js` stops with their names; origins lose a trailing
  slash; `SIGTERM` closes Socket.IO and the HTTP server (which waits for open requests), then MongoDB.
  Tests: `tests/env.test.js`. `/api/health` also returns `data.version` (the deployed commit) for the live smoke check.

### F-016 – Low – The Admin page read whole collections
- **Where**: `server/src/services/adminService.js` (stats per day, active users, newest accounts).
- **What**: `createdAt` had no index on transactions and users, so the four Admin queries were COLLSCANs over every
  transaction of every user. Every query a normal user makes already used an index.
- **Reproduce**: `tests/indexes.test.js` runs `explain()` on the 31 main queries and aggregations of the services, with the
  same filters and sorts (red: the 4 admin queries).
- **Fix**: `Transaction { createdAt: 1 }` and `User { createdAt: -1, _id: -1 }`. Both are plain (not unique) indexes, so
  existing data cannot violate them, and Mongoose catches a failed automatic index build (the app keeps running).

### F-017 – Low – The monthly report looked up categories by id only
- **Where**: `server/src/services/reportService.js` (`Category.find({ _id: { $in } })`).
- **What**: the ids come from the user's own transactions, so nothing leaked, but the query did not say `userId` like
  every other lookup. It now filters by the owner and reads only `name color icon` (defence in depth).

### F-018 – Medium – The end-to-end suite failed at random
- **Where**: `client/playwright.config.js`, `client/e2e/notifications.spec.js`, `client/e2e/security-perf.spec.js`.
- **What**: the baseline run had 10 failures out of 298 and a second run 5, nearly all "Test timeout of 30000ms
  exceeded" in long tests (breadcrumbs visits 9 pages, admin, real-time with 3 browsers). The tests ran on the Vite
  **dev server**, where every full page load fetches and revalidates hundreds of separate modules, so a long test took
  more than 30 s whenever the machine was busy. One more failure was a race in the test itself: after turning a
  notification switch back on it reloaded the page without waiting for the save, so the request could be cancelled.
- **Fix (root causes, no timeout raised)**: the suite runs on the **production build** served by `vite preview` (the
  code that is deployed, one server less); the service worker is blocked there except in `offline.spec.js`, which needs
  it. The switch test waits for "Settings saved" like its own step 2. The "Login does not download the charts" test
  recognised Recharts by a dev-server path; it now recognises the library by its text ("recharts-wrapper"), whatever
  file name the build gives it. Result: 17.9 min → 7.7 min, and the 3 required runs in `docs/review/final-review.md`.
  Two later random failures: `chooseOption` (`e2e/helpers/controls.js`) clicked an option in the list of another
  Select that was still playing its closing animation; it now clicks in the list named by `aria-controls` of its own
  combobox. The progress bar blink behind another one is F-033.

### F-019 – Low – Two error-code tests checked nothing
- **Where**: `server/tests/errorCodes.test.js:16,22`.
- **What**: `{ ..., code: "EMAIL_TAKEN", code: expect.any(String) }`: the second key replaces the first, so the test
  accepted any code. Found by ESLint (`no-dupe-keys`). The duplicate was removed: the tests check the exact code again.

### F-020 – Low – Dead code and a temporary page
- **What**: `components/EmojiPicker` (replaced by `IconPicker`, only its own test imported it), `pages/HomePage.jsx`
  + CSS (no route), `pages/transactions/DeleteTransactionDialog.jsx` (replaced by Undo; its CSS is shared by five
  other dialogs and moved to `components/Modal/ConfirmDelete.module.css`), `ProtectedRoute.module.css` (never
  imported), the dev-only `/style-guide` page with `pages/styleGuide/*`, three tokens only that page used, and six
  `.gitkeep` files in folders that have code. Found with an import-graph script from `main.jsx`; `npx depcheck`
  found no unused package in either folder. The EmojiPicker test went with the component it tested.
  `docs/brand` stays: it is the logo's design note (`Logo.jsx` points to it); the app has no `/brand` route.

### F-021 – Low – Two places called the API without `src/api`
- **What**: `AuthContext.jsx` (login, register, demo, me) and `ApiStatus.jsx` (health) used the axios instance
  directly. They now use `src/api/auth.js` and `src/api/health.js`; nothing outside `src/api` imports the instance.

### F-022 – Low – Business logic in controllers, duplicated helpers
- **What**: "create the recurring transactions that are due before reading" was written in six controllers. It now
  lives in the services (`listTransactions`, `getSummary`, `listBudgets`, `getMonthlyReport`, `getYearlyReport`,
  `getInsights`, `listRules`), so every controller only reads the request and sends the answer. `escapeRegex` was
  written twice (`utils/regex.js` now); the health handler moved from `routes/index.js` to `healthController.js`.

### F-023 – Low – No linter; what ESLint found
- **What**: neither folder had ESLint (the CI ran `npm run lint --if-present`, i.e. nothing). `eslint` + `@eslint/js`
  (recommended rules) were added with `npm run lint` (`--max-warnings=0`, unused disable comments are errors).
  Besides F-019 it found two unused imports, an unused variable, an error re-thrown without its `cause`, two
  `eslint-disable` comments for a plugin that is not installed (now plain comments), and invisible BOM characters in
  `csv.js` and three test files (now written `﻿`). Both folders lint clean with no disable comment.

### F-024 – Medium – Pages jumped while their data arrived (layout shift)
- **Where**: `client/src/components/AppLayout/AppLayout.module.css`, `components/Aurora/Aurora.module.css`,
  `pages/TransactionsPage.jsx`.
- **What**: Lighthouse measured a Cumulative Layout Shift of **0.526** on the Dashboard on a phone ("poor" is above 0.25).
  Four causes, found by recording the layout-shift entries while the API was slow: (1) on a phone the layout grid had
  two `auto` rows and `min-height: 100vh`, so while a page was short (still loading) the grid stretched the top bar to
  ~270 px, which then shrank back and pushed the whole page up; (2) the footer showed under the short page, then got
  pushed away; (3) the warm light of the hero (`Aurora`) was placed with `bottom: -190px` and moved whenever the hero
  grew; (4) on Transactions the totals of the hero appeared only when they arrived (+134 px) and the wallet filter only
  when the wallets arrived (+54 px on a phone), pushing the filters and the list down.
- **Reproduce**: `client/e2e/layout-shift.spec.js` holds the API answers back 1.5 s and adds up the layout shifts:
  Dashboard 0.18 / 0.53 and Transactions 0.23 / 0.59 (desktop / phone) before the fix; the limit is Lighthouse's
  "good" 0.1.
- **Fix**: `grid-template-rows: auto 1fr` on a phone; `.main` is at least one screen high; the light is placed from the
  top and moved with `translate` in container units (a transform is not a layout shift); the totals keep their place
  with skeletons of the same height (a failed summary hides them); the wallet filter is always there (every account
  has its Cash wallet). After: under 0.01 on every signed-in page, desktop and phone; Lighthouse CLS 0.019.

### F-025 – Low – "Skip to content" pointed to an element that does not exist
- **Where**: `components/SkipLink/SkipLink.jsx` links to `#main`; only the landing page had `id="main"`.
- **What**: the link still worked through its click handler, but without a target it is not a real skip link (Lighthouse
  accessibility 98 on the Dashboard: "Skip links are not focusable"). Every `<main>` (app layout, sign-in pages, static
  pages, full-page messages) now has `id="main"`.

### F-026 – Medium – Closing a dialog lost the keyboard focus
- **Where**: `components/Modal/Modal.jsx`, `components/Drawer/Drawer.jsx`, `components/Tour/Tour.jsx` (and the command
  palette, which is a Modal).
- **What**: React removes the `<dialog>` without calling `close()`, so the browser does not give the focus back: after
  Escape a keyboard user was on `<body>` and had to Tab again from the top of the page (WCAG 2.4.3 Focus Order).
  Keeping the focus inside while open was already right (native modal dialog: the page behind is inert).
- **Reproduce**: `client/e2e/keyboard.spec.js` (dialog, transaction drawer, Ctrl+K): red on "focus goes back to its button".
- **Fix**: `hooks/useRestoreFocus.js` remembers what had the focus when the dialog appeared and focuses it again when the
  dialog is gone (skipped if that element no longer exists). Unit test `useRestoreFocus.test.jsx`.

### F-027 – Medium – The calendar days broke "label in name" (axe: serious)
- **Where**: `pages/reports/CalendarTab.jsx`.
- **What**: a day shows "10" and "1M" but its `aria-label` was "10 October 2026: spent 1,000,000 ₫", which does not
  contain "1M": a voice-control user cannot say what is on screen (WCAG 2.5.3). axe reports it as serious on desktop
  (on a phone the short amount is hidden). The baseline sweep did not catch it because the demo month then had only one day.
- **Reproduce**: `client/e2e/a11y.spec.js` "Reports > Calendar" (now part of the every-page list).
- **Fix**: the name of a day button is what it shows; the whole sentence is its description (`aria-describedby`), read
  right after it. The tests that found days by the sentence in their name (`CalendarTab.test.jsx`, `e2e/reports.spec.js`)
  now find them by their place in the grid and check the description: the accessibility contract changed, nothing is
  checked less.

### F-028 – Low – The 404 page and the error screen had no main heading
- **What**: `FullPageMessage` showed its title through `EmptyState`, which is an `h2` (right inside a page, wrong when it
  is the whole page). `EmptyState` takes `titleAs`; `FullPageMessage` passes `h1`.

### F-029 – Medium – Tablets and small laptops: hidden notes and pages wider than the screen
- **Where**: `pages/transactions/TransactionList`, `pages/reports/MonthlyTab` + `YearlyTab`, `pages/recurring/RuleRow`,
  `pages/wallets/TransferHistory`, `pages/reports/CalendarTab` (CSS modules).
- **What**: these layouts switched by the width of the **window** (`@media`), but from 768 px the sidebar takes ~280 px,
  so the content was much narrower than the breakpoints assumed. Found by a sweep of every page in 8 languages at 390,
  768, 1024, 1280 and 1440 px that measures overflow and cut text: at 768–1024 px the **note column of the transactions
  table shrank to 0 px** (only the icon was left, in every language); Reports (Monthly, Yearly) and Recurring were wider
  than the window at 768 px (823 / 837 / 907 px, horizontal scrolling, the totals cut to "18,000…"); the transfer
  history kept 20 px for its date and note; German calendar amounts were cut in ~31 px cells.
- **Fix**: each of them reads the width of its own box (`container-type: inline-size` + `@container`): the transactions
  list shows its cards below 860 px of room, the rule rows and the transfer rows use their compact layout below
  760 / 640 px, the calendar leaves the short amount out below 520 px (the description still says it), and the report
  stat cards use `repeat(auto-fit, minmax(min(15rem, 100%), 1fr))` (3, 2 or 1 per row). The sweep is clean afterwards
  (only long notes and category names end with "…", by design).

### F-030 – Low – Landing page header wider than a phone without the web font
- **What**: at 390 px in French and Spanish, with the system font (before Google Fonts arrive, or where they are
  blocked), "Se connecter" stuck out of the header by 10–17 px. The wordmark of the logo (an SVG) may now shrink a little
  (`min-width: 0`, `height: auto`) while the buttons keep their size.

### F-031 – Low – Colors written in components instead of tokens.css
- **What**: 57 `rgba(...)`, three `#000` / `#ffffff` in 20 CSS modules and `fill="#ffffff"` in the dashboard chart (the
  glass panels of the dark parts: white or black at a few percent, and the aurora tints).
- **Fix**: four base tokens in `tokens.css` (`--glass-light`, `--glass-shade`, `--glass-ink`, `--glass-night`; the
  aurora colors already existed) and `color-mix(in srgb, var(--token) 10%, transparent)`, which is the same color as
  `rgba(255, 255, 255, 0.1)`, so nothing looks different. The SVG fill is a CSS class. No color is left outside the tokens.

### F-032 – Medium – The first visit downloaded all 8 languages and waited for Google Fonts
- **Where**: `client/src/i18n/index.js`, `client/index.html`, `client/vite.config.js`, `pages/WelcomePage.jsx`.
- **What**: the 8 translation files (~430 kB of JSON) were in the first JavaScript files every visitor downloads, the
  Google Fonts stylesheet and `registerSW.js` blocked the first paint, and the image of the landing page had no priority.
  Lighthouse (mobile) on /welcome: Performance 77, LCP 5.3 s.
- **Fix**: English stays in the main file (first language and fallback); every other language is its own file loaded
  by a small i18next backend when `changeLanguage` needs it (`main.jsx` waits for a saved language, so there is no flash
  of English; the service worker precaches them all for offline use); the fonts stylesheet loads without blocking
  (`media="print"` + `onload`, `<noscript>` fallback); `registerSW.js` is deferred (with `skipWaiting` / `clientsClaim`
  written explicitly, because the plugin only adds them in its default mode); the hero image has `fetchPriority="high"`.
  JavaScript of the first page: 1.15 MB (≈370 kB gzip) → 835 kB (269 kB gzip); biggest chunk 513.62 → 512.6 kB.
  First visit (no service worker, measured again at the end): /welcome mobile FCP 2.2 s → 1.2 s, performance 77 → 77
  (the largest paint, the hero picture, still waits for the JavaScript; see final-review.md), desktop 97 → 98.
  The 93 / 86 written here first came from a run where the service worker of an earlier visit was still installed.
  Test: `src/i18n/i18n.test.js`.

### F-033 – Low – The progress bar at the top blinked between a page and its data
- **Where**: `client/src/hooks/useTopProgress.js`.
- **What**: the bar went away the moment nothing was pending. A page that took a while to open (its code file) and
  then asked the API for its data left a short gap between the two, so the bar disappeared and came back. An
  end-to-end step that waited for the bar to go could also pass inside that gap.
- **Fix**: when everything is done the bar waits 150 ms before it hides; a request that starts in that time keeps it
  on screen. Test: `src/hooks/useTopProgress.test.jsx`.

### F-034 – Medium – The offline banner could stay after the network came back
- **Where**: `client/src/hooks/useOnline.js`.
- **What**: the banner "You're offline – showing saved data" and the lock on every button that writes to the API
  followed only the `online` / `offline` events. A browser can change `navigator.onLine` without firing the event:
  Playwright's Firefox does it for a page that was loaded while offline (measured: `navigator.onLine` is true again,
  no event; Chrome and WebKit fire it). The page then stayed "offline", with add / edit / delete locked, until a
  reload. Found by the new Firefox run of `e2e/offline.spec.js`.
- **Fix**: one watcher shared by every component that uses the hook: the two events, plus a look at `navigator.onLine`
  every 2 seconds (components only render again when the value changes). Test first: `src/hooks/useOnline.test.jsx`
  ("goes away when the network is back even if the browser fires no online event").

### F-035 – Low – An index that could not be built failed without a word
- **Where**: `server/src/config/db.js`.
- **What**: Mongoose builds the indexes in the background after it connects. One it cannot build (for example a unique
  index over duplicates already in Atlas) does not stop the server (reproduced on an in-memory database: the model
  emits `index` with error E11000 and keeps working), but nothing listened to that event, so Render's log said
  nothing while the rule was missing.
- **Fix**: `logIndexErrors()` names the model and the error in the log; `connectDB()` calls it before it connects.
  Test first: `tests/indexErrors.test.js`.

### F-036 – Low – The docs did not list every error code, and nothing compared them with the code
- **Where**: the Swagger comments of `server/src/routes/*.js`, `server/src/config/swagger.js`, `docs/api-plan.md`,
  `docs/erd.md`.
- **What**: 58 error examples in the Swagger comments showed a `message` but no `code` (a real answer always has one);
  3 error answers had no example at all (`PATCH /transactions/{id}` 404, `POST /auth/login` 400, `GET /admin/users`
  400); 29 codes the API can send were nowhere in the Swagger spec; the `code` / `params` of a refused row of the CSV
  import were not documented; the code table of api-plan.md missed the four defaults (`UNAUTHORIZED`, `NOT_FOUND`,
  `CONFLICT`, `REQUEST_ERROR`); the ERD missed 9 indexes and the amount and date rules of this review. A route or a
  code added later on one side only would not have been noticed.
- **Fix**: the codes were filled in from the `httpError(...)` calls of `src/` (no guess); the missing examples were
  written; `ErrorResponse.code` lists every code (`ERROR_CODES_BY_STATUS` in `config/swagger.js`); `erd.md` has an
  index table. `tests/apiDocs.test.js` now checks that the routes of Express = the Swagger paths = the table of
  api-plan.md = its numbered sections; every Swagger operation has a summary and examples, and every error example a
  known code; the codes in `src/` = the Swagger list = the table of api-plan.md, each under the status the code
  really sends; the client has an English text for every code; each model's ERD block has exactly the fields of its
  schema. Each check was seen failing on a deliberate mistake.

### F-037 – Low – The new Firefox and iPhone Safari runs failed because of the test setup
- **Where**: `client/playwright.config.js`, `client/e2e/*`.
- **What**: the first run of the `@smoke` tests on Firefox and WebKit (iPhone 14): 15 of 52 failed. Causes, each
  measured: (1) 9 spec files chose the phone layout with `testInfo.project.name === 'mobile'`, so an iPhone project
  counted as a desktop; (2) Playwright's WebKit draws without the GPU: the endless decorative animations (three lights
  blurred by 64 px, the logo coin) cost about 0.6 s per frame (574 ms on an idle page, 639 ms with a dialog open,
  16 / 36 ms without them), so the "element is stable" check before every click waited for seconds; (3) six parallel
  Firefox / WebKit workers on a 6-core laptop: the first page load took 15.5 s instead of 2.6 s, and the long tests
  ran three times slower than alone (admin 40 s, alone 12.8 s); (4) the offline banner, an app bug (F-034).
- **Fix**: `isPhone(testInfo)` (`e2e/helpers/device.js`) reads the `isMobile` of the device; the WebKit project emulates
  `prefers-reduced-motion`, which the app follows (the CSS is already the GPU-friendly kind, only `transform` with
  `will-change`, so the app was not changed for an engine without GPU); Firefox and WebKit run one test at a time
  each (`workers: 1` per project), Chrome keeps the default. Second run: 5 failures (all from cause 3), third run:
  52 / 52. No timeout was raised and no test was skipped.

### F-038 – Medium – A saved category, budget or goal could vanish, a deleted rule or budget come back
- **Where**: `client/src/pages/CategoriesPage.jsx`, `BudgetsPage.jsx`, `GoalsPage.jsx`, `RecurringPage.jsx`.
- **What**: these pages load their list in an effect and, after a save or a delete, change the list on screen
  themselves. A load that started before the change (the first load, or a live refresh after a change on another
  device) could answer after it, and its old list replaced the screen: the new item disappeared, a deleted one came
  back, until the next reload. On Categories this needs no second device: the form works while the first list is
  still loading, so a quick "Create category" on a slow phone network loses its card. Found by the third final
  Chromium run: `e2e/quick-ux.spec.js` "a category icon picked in the form..." (phone) did not find the new card
  (its trace was overwritten by the next run; the unit tests below reproduce the order of the answers).
- **Fix**: Categories, Budgets and Goals count their own changes in a ref; a list asked for before a change is not
  used and is asked for again (Goals also drops its own background refresh when a newer change came). Recurring
  already did this for its on / off switch by loading again; deleting a rule now does the same. Tests first:
  `src/pages/CategoriesPage.test.jsx` (first load), `BudgetsPage.test.jsx`, `GoalsPage.test.jsx`,
  `RecurringPage.test.jsx` (live refresh); each failed on the line right after the old answer arrived.
  Transactions and Notifications already loaded again after every change.

### F-039 – Low – The "Session expired" test from the Dashboard raced the Dashboard
- **Where**: `client/e2e/ux-polish.spec.js` ("also from the Dashboard: ...").
- **What**: the test replaced the token, then clicked a month arrow so that this click made the first request with
  the bad token. Its `waitForLoadState('networkidle')` did not wait at all (the app moved from /register to / without
  a page load), and the Get started card of a new account asks for budgets and goals a moment after the first
  numbers. In one final run those two requests came first (trace: `GET /api/budgets` and `/api/goals` → 401), the
  dialog opened, and the click was blocked by it. The app was right; the test was not.
- **Fix**: the test waits for the answers of `/api/budgets` and `/api/goals` (waiters made before registering) before
  it replaces the token.

### F-040 – High – With `trust proxy` 2 the rate limits still followed a proxy, not the visitor
- **Where**: `server/src/middlewares/rateLimit.js` (no `keyGenerator`, so `req.ip`), `server/src/app.js` (`trust proxy` 2).
- **What**: the fix of F-001 assumed two hops. After the deploy the live smoke check failed (expected 298, got 299: a
  fresh counter). Measured again from one computer on 2 November 2026 (15 requests, one connection each): counters
  295, 294, 293, 292, 291, **299**, 298, **299**, **299**, 290, 289, **298**, 288, 287, 298, while Cloudflare's own
  `/cdn-cgi/trace` showed the same visitor address every time. So the last two addresses of `X-Forwarded-For` both
  belong to the path (at least `visitor, cloudflare-edge, render-proxy`). `tests/security.test.js` encoded the
  disproved two-hop chain; that test was rewritten with the measured chain (the reason a test was changed).
- **Fix**: the limits count `CF-Connecting-IP`, the address Cloudflare writes for every request. A visitor cannot
  forge it: Cloudflare refuses a request that already carries that header (measured: 403, `error code: 1000`), while a
  forged `X-Forwarded-For`, `X-Real-IP` or `True-Client-IP` passes, so those are not read. Without the header (this
  computer, the tests) the key is `req.ip` with `trust proxy` = 3, which the measurement shows is safe: a forged address
  stays left of the visitor. IPv6 addresses count per /56 block (`ipKeyGenerator` of express-rate-limit). Tests first:
  `tests/security.test.js` "counts the visitor Cloudflare names in CF-Connecting-IP..." and "without
  CF-Connecting-IP, counts the visitor three hops back..." (both red before the fix). Live: `e2e/live/site.live.js`
  gains "a visitor cannot send CF-Connecting-IP himself" (green already, it checks Cloudflare); the counter check turns
  green only once Render runs this code.
- **Remaining risk**: whether Render's proxy passes `CF-Connecting-IP` on is only visible after the deploy. If it does
  not, `trust proxy` 3 is the second chance; the live smoke run after the merge tells.

### F-041 – Medium – The WebKit admin test ran out of its 30 s on the CI
- **Where**: `client/playwright.config.js` (project `webkit`).
- **What**: `e2e/admin.spec.js` "an admin sees the statistics..." failed on WebKit in all three CI runs of PR #33, at
  the second click on Disable. The trace shows no hang: every click waited for the page to hold still (4.7 s for Log
  in, 7.4 s for Open menu, about 2 s for each of the others, 19.6 s in all), so the 30 s were gone before the end. The
  iPhone 14 profile draws 3 device pixels per CSS pixel, without a GPU, on 4 shared processors. Reproduced on Linux in
  `mcr.microsoft.com/playwright:v1.64.1-noble` limited to 1.5 processors: 10.4 s of waiting at 3 pixels, 3.0 s at 1
  (36 s and 19 s for the whole test).
- **Fix**: the WebKit project keeps the iPhone 14 screen size, touch, user agent and reduced motion, and draws at
  `deviceScaleFactor: 1`. No test or timeout was changed. The 52 Firefox / WebKit tests then passed on Linux with
  3 processors; the final proof is the CI run of the branch.

### F-042 – Low – The tour card showed the new step at the place of the last one for a frame
- **Where**: `client/src/components/Tour/Tour.jsx` (the card was placed in a `requestAnimationFrame`).
- **What**: after Next, the card already showed step 2 (with its Back button) but still stood where step 1 had put it,
  until the next frame. On a busy CI machine that frame came late: `e2e/ux-polish.spec.js` "Skip closes it for
  good..." clicked Back at (1028, 662), where the card of step 1 had been, and the click went to the page behind
  (trace of run 41457585803). A quick double click by a person can do the same.
- **Fix**: the card is placed in a layout effect, before the browser paints, so it is never drawn at the old place.
  The `<dialog>` is opened in a layout effect declared before it: the first version of the fix measured the card while
  the dialog was still closed (no size), which put it off screen and turned the 6 tour tests red in the first local
  end-to-end run. Test first: `src/components/Tour/Tour.test.jsx` gives elements their size only inside an open dialog
  and checks that the card is next to the new element right after the click (red before each of the two changes).

### F-043 – Low – CI actions on Node 20, and a runner image that moves by itself
- **Where**: `.github/workflows/ci.yml`, `live-smoke.yml`.
- **What**: every run warned that `actions/checkout@v4`, `actions/setup-node@v4` and `actions/upload-artifact@v4` run
  on Node 20, which GitHub is removing, and that `ubuntu-latest` moves to Ubuntu 26 from October 2026.
- **Fix**: `checkout@v5`, `setup-node@v5`, `upload-artifact@v6` (all on Node 24) and `runs-on: ubuntu-24.04`.

### Checked without a defect (tests added so it stays that way)
- Mass assignment on every create / update route (`tests/massAssignment.test.js`).
- Vietnam time at the edges: budgets, the default month at 00:30 on the 1st while UTC is still in the previous month,
  the 7 days of the weekly summary (`tests/vietnamTime.test.js`); transactions, stats, reports, insights, recurring rules
  and leap years were already covered.
- One month gives the same numbers on the Dashboard, the monthly / yearly / calendar reports, the budgets, the CSV
  export and the wallets, to the last dong, with 999,999,999,999 in the sum (`tests/crossCheck.test.js`).
- Requests at the same moment: one budget warning for two expenses, one weekly summary for five lists, a bulk delete
  from two devices, duplicate category / budget / email → 201 + 409, never 500 (`tests/concurrency.test.js`).
- Category delete takes its budgets and templates, and a refused delete keeps them (`tests/cascade.test.js`).
