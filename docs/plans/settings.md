# Plan: Profile, account security and settings (phase 18)

Branch: `feature/settings`.

Done when: changing the password and "log out of all devices" make the old tokens useless, dark mode survives F5,
and deleting the account leaves no document of the user in any collection.

## Checklist
### Backend
- [x] `User`: `tokenVersion` (default 0), `preferences.theme` / `weekStartsOn` / `language`
- [x] JWT carries `tv`; `requireAuth` reads the user and answers 401 `TOKEN_INVALID` when the version differs (or the user is gone)
- [x] `PATCH /users/me` (name)
- [x] `PATCH /users/me/password` (wrong current password = 400 `WRONG_PASSWORD`, new >= 8 chars and different, bumps `tokenVersion`, returns a new token)
- [x] `POST /auth/logout-all` (bumps `tokenVersion`, returns a new token)
- [x] `PATCH /users/me/preferences` accepts `theme`, `weekStartsOn`, `language` besides `notifications`
- [x] `GET /users/me/export` (declared before any route with a parameter) and `DELETE /users/me` (body `password`, wrong = 400)
- [x] Swagger docs for every route, `docs/api-plan.md`, `docs/erd.md`
- [x] Tests: `server/tests/settings.test.js` (+ fix the one old notifications test that assumed `theme` is refused)

### Frontend
- [x] `tokens.css`: dark palette under `[data-theme="dark"]`; script in `index.html` that sets `data-theme` before React loads
- [x] `utils/theme.js` (+ unit tests), `ThemeContext`, charts re-read their colors when the theme changes
- [x] `AuthContext`: `saveSession` exposed (new token), user preferences applied on login (theme, language), name visible in the nav
- [x] Settings page: Profile, Password (strength bar), Sessions, Appearance, Preferences (week start + notification switches), Your data, Danger zone
- [x] Calendar of Reports uses `weekStartsOn`
- [x] `navItems` + route, language switcher syncs to `preferences.language`
- [x] Locale keys in en.json and the 7 other locales (UI texts + new API error codes)
- [x] `docs/ui-style.md` (dark palette)
- [x] Vitest: `utils/theme`, `utils/passwordStrength`, `buildCalendar` with Sunday, danger zone component
- [x] Playwright: `client/e2e/settings.spec.js` (name in the nav, dark mode after F5, new password login)

### Checks
- [x] `cd server && npm test`
- [x] `cd client && npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`
