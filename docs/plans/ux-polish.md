# Phase: UX polish (`feature/ux-polish`)

Course: "Phát triển ứng dụng web và cơ sở dữ liệu" (Web application and database development), class CSBU109.R11.KHBC, UIT.

## Findings (step 2, live check)
- CLAUDE.md "Live URLs" still holds the placeholders `[link Vercel]` / `[link Render]`, so the live site cannot be curled from here.
- No backend change in this phase: no new endpoint, model or error code. `docs/api-plan.md` and `docs/erd.md` stay as they are.

## Decisions
- `main.jsx` moves from `<BrowserRouter>` to `createBrowserRouter` with one splat route around `<App />`: `useBlocker` (ask before leaving a form) only works in a data router. The routes stay in `App.jsx`.
- `/settings/:section?` is one route: `SettingsPage` picks the section from the address. Wide screens redirect `/settings` to `/settings/profile`, phones show the list of cards there.
- Admin is split in two real levels, so Back has somewhere to go: `/admin` (numbers and charts) and `/admin/users` (the table).
- Breadcrumb: `Home (icon, /welcome) / Page / Child`. The Dashboard level is gone from the trail of other pages (the example in the prompt is Home / Settings / Profile).
- The tour is remembered per browser (`ledgerling.tourSeen` in localStorage), no server field. The E2E tests set that key in `storageState`, so only the tour test sees it.
- A 401 keeps the page on screen behind the dialog. `AuthContext` holds `sessionExpired`; "Log in again" clears the user and `ProtectedRoute` sends the visitor to /login with `state.from`, also from "/". A socket refused with `TOKEN_INVALID` shows the same dialog.
- Collapsing a card keeps its content mounted (a CSS grid row from 1fr to 0fr, `inert` while closed), so a chart never loads twice. Printing opens every card.
- Only Profile and Password count as unsaved forms: the other sections save on click, and Danger zone saves nothing.

## Checklist
### 1. Settings
- [x] Section config, routes, side menu on wide screens, card list on phones, Back to the list
- [x] Danger zone is its own red section; demo account has no Security / Danger
- [x] Danger fields never autofilled (name, autocomplete, password manager ignore attributes)
- [x] Ask before leaving Profile / Password with unsaved changes (router and browser close)

### 2. The way back
- [x] /welcome for a signed-in user: Open app instead of Log in and Get started
- [x] Logo in the sidebar goes to /welcome
- [x] Breadcrumb starts with a Home icon to /welcome
- [x] Back button: Settings sections, transaction drawer, Admin / Users

### 3. Collapse
- [x] Sidebar 72px icon rail, tooltips, localStorage, `[` key
- [x] Collapsible cards on Dashboard and Reports, state per card in localStorage
- [x] Smooth, off with prefers-reduced-motion

### 4. Language picker
- [x] Globe + short code; list with own-language name, code and tick; only the code in the collapsed sidebar

### 5. Extras
- [x] User menu: Profile, Settings, Theme, Keyboard shortcuts, Take the tour, Log out
- [x] Command palette Ctrl+K / Cmd+K: pages, transactions by note, Add transaction, Toggle theme, Change language
- [x] Tour on first sign-in, Skip, reopen from the user menu
- [x] Session expired dialog, back to the same page after logging in
- [x] Thin progress bar on route changes and requests
- [x] Skip to content link
- [x] About, Privacy, Terms pages, linked from the footer of /welcome

### 6. i18n, tests, docs
- [x] All new text in 8 locale files, `npm run i18n:check` clean
- [x] Unit tests for the new hooks and helpers
- [x] Playwright: `e2e/ux-polish.spec.js`, old specs updated where the behavior changed on purpose
- [x] docs/ui-style.md updated

### Checks
- [x] server `npm test`
- [x] client `npm test`, `npm run build`, `npm run test:e2e`, `npm run i18n:check`
- [x] Looked at 1440px and 390px

## Results
- server `npm test`: 555 passed
- client `npm test`: 707 passed; `npm run build` OK; `npm run i18n:check`: 8 languages, 879 keys each; no `lint` script exists
- client `npm run test:e2e`: 275 passed, 5 skipped on purpose (tests for one screen size only)

## Found on the way
- `NotificationsPage` and `RecurringPage`: a slower answer to an older request could replace newer data. Fixed in this phase.
- On a loaded machine Vite can refuse one connection (`ERR_CONNECTION_REFUSED`), which leaves a test on a blank page. Seen once in the E2E runs, not caused by the app.
