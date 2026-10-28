# Ledgerling – Auth Feature Plan

Branch: `feature/auth`. API contract: `docs/api-plan.md` §Auth (endpoints 2–4).

## Goal

Every later feature (categories, transactions, reports) needs a signed-in user, and the `userId` must always come
from the token, never from the request body. This feature adds:

- **Backend:** User model, `POST /api/auth/register` (password hashed with bcryptjs), `POST /api/auth/login`
  (returns a JWT), a middleware that checks the JWT, `GET /api/auth/me`, input validation and Swagger docs.
- **Frontend:** `AuthContext`, `ProtectedRoute`, and the Login and Register pages built from the style-guide mock.

Done when register / login / me work, are documented in Swagger and tested in Postman; Login and Register match the
mock; app pages require login; the session survives a page refresh.

## Starting point

- **Server:** `middlewares/errorHandler.js` already turns `err.status` / `err.message`, Mongoose `ValidationError` /
  `CastError` and duplicate key `11000` (→ 409) into `{ success: false, message }`. `config/swagger.js` already
  declares the `bearerAuth` scheme. bcryptjs, jsonwebtoken and mongoose are installed.
- **Client:** `api/axios.js` already sends `Authorization: Bearer <token>` from `localStorage.token` and redirects to
  `/login` on 401. The Login screen is designed in `pages/styleGuide/LoginPreview.jsx`, the form kit in
  `pages/styleGuide/ui.module.css`.

## Design decisions

### Backend

- **Layers:** route → validation middleware → controller → service → model.
- **Errors:** services `throw httpError(status, message)` and the existing error handler builds the response.
  Express 5 passes errors from async handlers to the error handler automatically, so controllers need no try/catch.
- **Validation:** hand-written middleware, no extra library. It starts from `req.body ?? {}` because Express 5
  leaves `req.body` undefined when no JSON body is sent (a request with the wrong body type would otherwise end in a
  500). On success it replaces `req.body` with only the expected fields, cleaned: trimmed name, trimmed and
  lowercased email, password untouched (never trimmed). Unknown fields such as `passwordHash` are dropped. The first
  failing rule gives the message.
- **Password:** hashed in the service with `bcrypt.hash(password, 10)`; login checks it with `bcrypt.compare`.
- **The hash never leaves the server:** the User schema's `toJSON` transform deletes `passwordHash` and `__v`, so a
  user can always be sent with `res.json` safely.
- **JWT:** `jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || "7d" })`. `sub` is the standard
  "subject" claim (who the token belongs to).
- **Stateless auth middleware:** it verifies the token and sets `req.userId`, without a database query.
  `GET /auth/me` loads the user and answers 401 if the account no longer exists.

### Frontend

- **`AuthContext`** is the single source of truth: `{ user, loading, login, register, logout }`. At start-up, if a
  token is stored, it calls `GET /auth/me` to restore `user`; if that fails, the token is removed.
- **Redirects, one rule each way:** `ProtectedRoute` sends guests to `/login` and remembers the page they wanted;
  `AuthLayout` sends a signed-in user to that page (or `/`). Login and Register never navigate themselves: setting
  `user` is enough. After registering, the user is signed in directly (the API already returns a token).
- **axios 401 rule:** requests to `/auth/*` are skipped (a wrong password or a stale token at start-up is handled by
  the auth code). A 401 from any other endpoint still means the session expired → `/login`.
- **Shared form components:** `TextField`, `Button` and `Alert` in `client/src/components/`, styled from
  `ui.module.css` (only the parts used now; more variants when a page needs them).
- **Client-side checks** use HTML attributes only (`required`, `type="email"`, `minLength`, `maxLength`). The
  server's message is shown in an error `Alert`, so the rules are not written twice.
- **UI additions approved for this feature** (recorded in `docs/ui-style.md` in step F6): a `user` icon on the Name
  field, and a centered, muted "Loading…" text while the session is restored.

## Steps

Each step is tested (Postman or browser) and committed on its own. No new libraries.

### Backend

**B1 – Foundation** (no endpoint yet)
- new `server/src/utils/httpError.js` – `httpError(status, message)` returns an `Error` with `.status`.
- new `server/src/models/User.js` – `name` (String, required, trim, maxlength 50), `email` (String, required,
  unique, lowercase, trim), `passwordHash` (String, required); `timestamps: true`; `toJSON` transform.
- `server/src/server.js` – stop at start-up if `JWT_SECRET` is missing.
- `server/src/config/swagger.js` – reusable schemas `User`, `AuthResponse` (`{ success, data: { token, user } }`),
  `ErrorResponse`.
- Test: the server starts; with no `JWT_SECRET` it refuses to start with a clear message; `/api-docs` lists the three
  schemas. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put
  it in `server/.env` (later also on Render); never commit it.
- Commit: `feat: add User model, error helper and JWT_SECRET check`

**B2 – POST /api/auth/register**
- new `server/src/middlewares/validateAuth.js` → `validateRegister`
- new `server/src/services/authService.js` → `register()` + private `signToken()`
- new `server/src/controllers/authController.js` → `register` (201)
- new `server/src/routes/authRoutes.js` → route + Swagger JSDoc (201 / 400 / 409)
- `server/src/routes/index.js` → `router.use("/auth", authRoutes)`
- Messages: "Name is required", "Name must be at most 50 characters", "Email is invalid"
  (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), "Password must be at least 6 characters", "Password must be at most 72
  characters". An existing email → 409 "Email is already registered" (the unique index is the safety net).
- Service: `findOne({ email })` → hash → `User.create` → `{ token, user }`.
- Test (Postman): valid → 201 and `data.user` has no `passwordHash` / `__v`; in Compass the email is lowercase and
  `passwordHash` starts with `$2`; the same email sent as `" TRI@Example.com "` → 409; each invalid field → its 400;
  body type "none" → 400 "Name is required" (not 500).
- Commit: `feat: add register endpoint`

**B3 – POST /api/auth/login**
- `validateAuth.js` + `validateLogin` ("Email is invalid", "Password is required"); `authService.js` + `login()`;
  `authController.js` + `login` (200); `authRoutes.js` + route + docs (200 / 400 / 401).
- Unknown email and wrong password give the same 401 "Invalid email or password".
- Test: valid (also with an upper-case email) → 200 + token; wrong password / unknown email → 401. Decoding the token
  in the browser console with `JSON.parse(atob(token.split('.')[1]))` shows `sub`, `iat` and `exp` (+7 days): the
  payload is readable, only signed, so it never holds secrets.
- Commit: `feat: add login endpoint`

**B4 – Auth middleware + GET /api/auth/me**
- new `server/src/middlewares/requireAuth.js` – reads `Authorization: Bearer <token>`; missing → 401 "Not authorized,
  token missing"; `jwt.verify` fails (bad or expired) → 401 "Not authorized, invalid token"; otherwise
  `req.userId = payload.sub`.
- `authService.js` + `getCurrentUser(userId)` (account gone → 401 "Not authorized, invalid token");
  `authController.js` + `me`; `authRoutes.js` + `GET /me` with `security: [{ bearerAuth: [] }]`.
- Test: with a token → 200 user; no header → 401 "token missing"; `Bearer abc` or one changed character → 401
  "invalid token"; expiry: set `JWT_EXPIRES_IN=20s`, restart (`rs` in the nodemon terminal), log in, wait, call → 401,
  then set it back to `7d`. In Swagger: Authorize with the token, then try `/auth/me`.
- Commit: `feat: add auth middleware and GET /auth/me`

**B5 – Docs + Postman**
- `docs/api-plan.md` – add the two "at most" messages to the register errors; note that `/me` answers
  "Not authorized, invalid token" when the account no longer exists.
- new `docs/postman/ledgerling.postman_collection.json` – variables `baseUrl` and `token`; Health, Register, Login,
  Me; the Register and Login scripts save `data.token`; collection-level Bearer `{{token}}` so later protected
  requests inherit it.
- Commit: `docs: sync auth docs and add Postman collection`

### Frontend

**F1 – AuthContext**
- new `client/src/context/AuthContext.jsx` – `AuthProvider` + `useAuth()`; `loading` starts true only when a token
  is stored.
- `client/src/main.jsx` – `<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>`.
- `client/src/api/axios.js` – new 401 rule (skip `/auth/*`).
- `client/src/components/AppLayout/AppLayout.jsx` – Log out calls `logout()` (clears the token and `user`), then goes
  to `/login`.
- Test: take a token from Postman, run `localStorage.setItem('token', '…')` in the DevTools console and reload →
  the Network tab shows `GET /auth/me` 200 with the Bearer header (twice in dev because of React StrictMode, which is
  expected). Log out → the token is gone. `localStorage.setItem('token', 'abc')` + reload → 401, token removed, no
  redirect loop.
- Commit: `feat: add AuthContext with session restore`

**F2 – Route guards**
- new `client/src/components/ProtectedRoute/ProtectedRoute.jsx` (+ `.module.css`) – while `loading`: a centered,
  muted "Loading…" text; no user: `<Navigate to="/login" replace state={{ from: location }} />`; otherwise
  `<Outlet />`.
- `client/src/App.jsx` – wrap the `AppLayout` routes in `<Route element={<ProtectedRoute />}>`.
- `client/src/components/AuthLayout/AuthLayout.jsx` – signed in → `<Navigate to={from ?? '/'} replace />`.
- Test: logged out, open `/transactions` → `/login`; with a token → `/transactions` opens and survives a refresh;
  `/login` while signed in → `/`; Log out, then the Back button → still `/login`.
- Commit: `feat: protect app pages and redirect signed-in users`

**F3 – Auth screen panel**
- `AuthLayout.jsx` + `AuthLayout.module.css` – the frame from `LoginPreview`: gradient panel (brand, headline, lead,
  two floating mini cards, `aria-hidden`) + a form side holding `<Outlet />`; frame
  `max-width: var(--content-max-width)`; the mock's responsive rules (short banner at ≤ 860px). The mini card label
  reads "Saved this month" (ui-style §7) instead of "Saved in October".
- `client/src/components/Icon.jsx` – add `sprout`, `mail`, `lock`, `eye`, `alert` from `styleGuide/icons.jsx`, plus
  a new `user` icon (head and shoulders, same stroke style) for the Name field.
- Test: compare `/login` and `/register` with `/style-guide#login`; at 390px the panel is a banner and there is no
  horizontal scroll.
- Commit: `feat: add auth screen panel from the login mock`

**F4 – Login form (UI only)**
- new `client/src/components/TextField/` (jsx + css) – label, optional left icon, input; `type="password"` adds the
  show/hide eye button (`aria-pressed`).
- new `client/src/components/Button/` (jsx + css) – pill button: `primary`, `block`, disabled.
- new `client/src/pages/AuthForm.module.css` – form column, subtitle, switch line and link, shared by Login and
  Register.
- `client/src/pages/LoginPage.jsx` – `PageTitle` "Welcome back" (same style as the mock title), subtitle, Email
  (`autoComplete="email"`), Password (`current-password`), "Log in", link "Create an account".
- Test: matches the mock; the eye toggles the password; an empty submit is stopped by the browser.
- Commit: `feat: build login form`

**F5 – Log in through the API**
- new `client/src/components/Alert/` (jsx + css) – error alert with icon, `role="alert"`.
- `client/src/api/axios.js` – `getErrorMessage(error)`: the API's message, otherwise "Cannot reach the server.
  Please try again."
- `LoginPage.jsx` – submit → `login()`; the button shows "Logging in…" and is disabled; errors appear in an `Alert`.
- Test: wrong password → "Invalid email or password"; server stopped → "Cannot reach the server…"; correct → the
  Dashboard; open `/transactions` logged out → log in → back on `/transactions`.
- Commit: `feat: log in through the API`

**F6 – Register page**
- `client/src/pages/RegisterPage.jsx` – "Create your account" / "Start tracking your income and expenses."; Name
  (`user` icon, `autoComplete="name"`, max 50), Email, Password (`new-password`, 6–72); "Create account" /
  "Creating account…"; "Already have an account? Log in".
- `docs/ui-style.md` §7 – record the two approved additions.
- Test: a new email → the Dashboard, token stored, user visible in Compass; the same email again → "Email is already
  registered"; a 5-character password is stopped by the browser.
- Commit: `feat: build register page`

**F7 – Signed-in user in the sidebar**
- `client/src/components/AppLayout/AppLayout.jsx` + `AppLayout.module.css` – the user block from `PreviewShell`
  (`.user`, `.userAvatar`, `.userText`): sun-tinted initials (a small local `initials(name)`, "Minh Tri" → "MT"),
  name and email above Log out. Hidden at ≤ 960px so the four-tab bottom bar stays as it is.
- Test: after logging in, the sidebar shows the initials, name and email from `/auth/me`; at 390px the tab bar is
  unchanged.
- Commit: `feat: show the signed-in user in the sidebar`

## Verification (whole feature)

- Postman: run Health → Register → Login → Me, plus the error cases above. Swagger `/api-docs` shows the Auth
  section and works with Authorize.
- Browser: logged out, any app URL lands on `/login`; register → the Dashboard with the name in the sidebar;
  refresh → still signed in; Log out → `/login`; a fake token is cleared; at 390px there is no horizontal scroll.
- `cd client && npm run build` passes.

## Not in this feature

- `/api/health` returns `{ success: true }` while `api-plan.md` documents `data: { status: "ok" }`: a separate small fix.
- The phone app bar with the avatar (ui-style §6) comes with the Dashboard work.
- No refresh tokens, password reset, rate limiting or email verification.
- Before deploying: set `JWT_SECRET` and `JWT_EXPIRES_IN` on Render (the start-up check stops the server if the secret
  is missing).
