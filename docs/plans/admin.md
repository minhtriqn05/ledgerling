# Plan: Admin dashboard and role-based access (phase 19)

Branch: `feature/admin`.

Done when: an admin sees the statistics and can disable / enable accounts, a normal user gets 403 on every admin route,
and a disabled account cannot log in.

## Decisions
- `role` and `status` are stored on the User. `requireAuth` reads them from the database on every request (not from the token), so a
  change applies at once. A disabled user is also refused there (401 `TOKEN_INVALID`) in case `status` was changed without raising `tokenVersion`.
- Disabling raises `tokenVersion`, so every old token of that user stops working (401).
- Login order: unknown email / wrong password = 401 first, then `status: disabled` = 403 `ACCOUNT_DISABLED`
  (a stranger cannot learn that an email is disabled without knowing the password).
- "Active user in the last 7 days" = a user who created at least one transaction in the last 7 days (no extra field needed).
- Statistics days are Vietnam days (UTC+7), last 30 days with today included, zero-filled.
- An admin cannot disable himself (403 `CANNOT_DISABLE_SELF`) or another admin (403 `CANNOT_DISABLE_ADMIN`).
- The first admin is made by hand: `npm run make-admin -- <email>` (only touches the database in `server/.env`).
- Playwright needs an admin: `server/src/e2e.js` (in-memory database only) creates one account at start.

## Checklist
### Backend
- [x] `User`: `role` (user | admin, default user), `status` (active | disabled, default active)
- [x] `httpError` default code for 403; `requireAuth` sets `req.user = { id, role }` and refuses a disabled user
- [x] `requireRole('admin')` middleware (403 `FORBIDDEN`)
- [x] Login: disabled account = 403 `ACCOUNT_DISABLED` "Account disabled"
- [x] `adminService`: `getStats`, `listUsers` (search + page), `setUserStatus` (raises `tokenVersion` when disabling)
- [x] `validateAdmin` middleware (`q`, `page`, `:id`, `status`)
- [x] Routes `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id/status` with Swagger tag Admin
- [x] Swagger: `User` schema gets `role` and `status`, new tag Admin, 403 response
- [x] `server/src/scripts/make-admin.js` + `npm run make-admin`
- [x] `server/src/e2e.js` creates an admin account
- [x] `docs/api-plan.md`, `docs/erd.md`
- [x] Tests: `server/tests/admin.test.js`

### Frontend
- [x] `api/admin.js`
- [x] `navItems`: Admin entry (`adminOnly`), shown only to admins in `AppLayout`
- [x] `AdminRoute` (not admin -> Dashboard) and the `/admin` route
- [x] Admin page: KPI cards, two line charts (new users, transactions per day), users table with search, pager and Disable / Enable with a confirm dialog
- [x] Locale keys in en.json and the 7 other locales (UI texts + new API error codes)
- [x] Vitest: `AdminRoute`, `UsersTable`, chart data helper
- [x] Playwright: `client/e2e/admin.spec.js`

### Checks
- [x] `cd server && npm test`
- [x] `cd client && npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check` (there is no `lint` script)
