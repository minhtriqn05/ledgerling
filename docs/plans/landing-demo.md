# Plan: Landing page, demo account, SEO and accessibility (phase 21)

Branch: `feature/landing-demo`.

Done when: a visitor who opens the link sees the landing page, "Try the demo" goes straight into the app with data, and the accessibility check passes.

## Decisions
- The demo user is `demo@example.com`. `DEMO_EMAIL` lives in one file (`server/src/utils/demo.js`); `isDemo` is `email === DEMO_EMAIL`, computed in `User.toJSON` (so login, register and `/auth/me` all carry it) and in `requireAuth` (`req.user.isDemo`).
- `POST /api/auth/demo` (no body, same `authLimiter` as login/register) signs in the demo user. No such user: 503 `DEMO_UNAVAILABLE` "Demo account is not available".
- A new middleware `blockDemo` answers 403 `DEMO_READ_ONLY` ("Not available in the demo account") on `PATCH /users/me/password`, `POST /auth/logout-all`, `DELETE /users/me`. Everything else (transactions, budgets...) stays open so the demo can be explored. `PATCH /users/me` (name), preferences and export are not blocked.
- Seed (`server/src/seed.js`, `npm run seed`): connects to `MONGODB_URI`, deletes only the demo user's documents and makes them again. The logic is `server/src/services/demoSeedService.js` (exports `seedDemo({ password })`), so tests can run it on the in-memory database. Dates are relative to today (Vietnam time) and the random numbers come from a fixed seed, so two runs give the same data. The Rent and Salary transactions are made by the two recurring rules (`processDueRules` at the end of the seed), never by hand.
- Window: the current month and the two before it ("last 3 months"). The rules start on the 1st of the oldest month and run on day 1.
- Client: `/welcome` is a public page (no layout). `/` for a visitor redirects to `/welcome`; `/welcome` for a signed-in user redirects to `/`. `ProtectedRoute` now sends a visitor on `/` to `/welcome` and any other private page to `/login`.
- Screenshots: `client/e2e/screenshots.capture.js` (run by `npm run screenshots`, not part of the normal e2e run); it logs in with the demo account on the e2e API and saves PNGs to `client/src/assets/screenshots`. The e2e API (`start:e2e`) seeds the demo user with the same `seedDemo`.
- OG image: `client/scripts/og-image.html` + `client/scripts/capture-og.mjs` (Playwright) -> `client/public/og-image.png` (1200x630).
- Site URL: CLAUDE.md still holds the placeholder `[link Vercel]`, so `index.html` uses `__SITE_URL__`, replaced at build time by a tiny Vite plugin from `VITE_SITE_URL` (default `https://ledgerling.vercel.app`).
- Accessibility: `@axe-core/playwright` (allowed in CLAUDE.md), one spec that scans 7 pages for `serious`/`critical` violations.

## Checklist
### Server
- [x] Read the code (auth, user, recurring, models, tests)
- [x] `utils/demo.js`, `isDemo` in `User.toJSON` + `requireAuth`
- [x] `middlewares/blockDemo.js`, apply on password / logout-all / delete account
- [x] `POST /auth/demo` (service, controller, route, rate limit, Swagger)
- [x] `services/demoSeedService.js` + `seed.js` + `npm run seed`
- [x] `.env.example` (`DEMO_PASSWORD`), `e2e.js` seeds the demo user
- [x] `docs/api-plan.md` (endpoint, `DEMO_UNAVAILABLE`, `DEMO_READ_ONLY`, `isDemo`), Swagger `User.isDemo`
- [x] Tests: demo 200 / 503, `isDemo`, 403 x3, other actions still work, rate limit, seed twice, seed data shape
### Client
- [x] `api/auth` demo call + `AuthContext.loginAsDemo`
- [x] `WelcomePage` (hero, 6 features with SVG icons, screenshots, how it works, footer with GitHub link) + CSS module
- [x] Routes: `/welcome`, `/` redirects, signed-in redirect
- [x] Try the demo: "Starting the server, this can take up to a minute" message
- [x] Settings: hide Password, Sessions, Danger zone when `isDemo`
- [x] Dashboard "Get started" card (3 steps with ticks) for an empty account
- [x] `index.html`: meta description, Open Graph, Twitter card, theme-color, robots.txt, og-image.png
- [x] Locale keys in all 8 files (`welcome.*`, `onboarding.*`, `errors.DEMO_*`)
- [x] Screenshots into `client/src/assets/screenshots`
- [x] Accessibility fixes
### Tests and checks
- [x] Vitest: helpers/components (GetStarted, WelcomePage, Settings isDemo, ProtectedRoute)
- [x] Playwright: `/welcome` for a visitor, Try the demo -> Dashboard with data, axe on 7 pages
- [x] `cd server && npm test`
- [x] `cd client && npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`
- [x] Stop servers, final report in Vietnamese

## Notes
- Live URLs in CLAUDE.md are still placeholders (`[link Vercel]`, `[link Render]`), so the check in step 2 of the workflow could not be done.
