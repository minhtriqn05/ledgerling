# Phase: polish, demo fix, avatars, breadcrumbs (`feature/polish-demo-avatar`)

Course: "Phát triển ứng dụng web và cơ sở dữ liệu" (Web application and database development), class CSBU109.R11.KHBC, UIT.

## Findings (step 2, live check)
- CLAUDE.md "Live URLs" still holds the placeholders `[link Vercel]` / `[link Render]`, so the live site cannot be curled from here.
- Local: `POST /api/auth/demo` against a seeded in-memory database answers 200 with a token; route, rate limit, CORS and the client call are fine.
- Most likely cause of a broken button on Atlas: the demo user was never seeded there (answer 503 `DEMO_UNAVAILABLE`). The seed must be run by the owner (`npm run seed`, needs `DEMO_PASSWORD` in `server/.env`).

## Checklist
### 1. Course name
- [x] CLAUDE.md, README.md, docs/, Swagger info, package.json descriptions, locales (footer note), index.html: no more MSIS207 / "Web Application Development"
- [x] UI footer says "UIT · CSBU109.R11.KHBC"

### 2. Demo button
- [x] Server logs a warning at start-up when the demo user is missing
- [x] Seed sets a fixed avatar; seed script verified on the in-memory database
- [x] Tests: 200 + Dashboard with data (exists), 503 + readable message (unit + e2e)
- [x] README: seed command + DEMO_PASSWORD

### 3. Avatars
- [x] 32 SVG presets in `client/src/assets/avatars` (Animals, Food, Nature, Fun), ids in `server/src/utils/avatars.js`
- [x] User.avatar `{ type, value }`; random preset on register; demo has a fixed one
- [x] `PATCH /api/users/me/avatar` (own 1 MB-ish body limit, preset id or WebP/PNG/JPEG data URL up to ~100 KB), `DELETE /api/users/me/avatar`, `/auth/me` returns it, demo 403
- [x] Client: Avatar component shows preset / upload / initial; crop+zoom dialog; resize to WebP 256x256 ≤ ~100 KB
- [x] Settings > Profile: tabs per group, Upload photo, Remove, live preview
- [x] Shown in sidebar, top bar, mobile menu, Admin users list, readable in dark mode

### 4. Breadcrumbs
- [x] Route config with breadcrumb keys, `Breadcrumbs` component (nav aria-label, aria-current), mobile "‹ Parent"
- [x] Reports tabs, Settings sections, Admin, Transactions drawer detail

### 5. i18n + tests
- [x] All new text in 8 locale files; `npm run i18n:check` clean
- [x] Server tests (avatar 400/413/403/401, own account only, demo endpoint)
- [x] Client unit tests (avatar utils, crop math, breadcrumb) + Playwright (demo, avatar pick + upload + reload, breadcrumb back)
- [x] docs/api-plan.md, docs/erd.md, Swagger updated

### Checks
- [x] server `npm test`
- [x] client `npm test`, `npm run build`, `npm run i18n:check`
- [x] client `npm run test:e2e` (202 passed)
