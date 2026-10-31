# Ledgerling – API Plan

Base URL: `http://localhost:4000/api` (local), `https://<render-app>.onrender.com/api` (production).
Swagger UI: `/api-docs` (outside `/api`).

## Conventions

- **Auth**: protected routes need the header `Authorization: Bearer <token>`.
  The token comes from `POST /auth/register` or `POST /auth/login`.
- **Success**: `{ "success": true, "data": ... }`
- **Error**: `{ "success": false, "message": "...", "code": "..." }`. `message` is English text for people (Postman,
  logs); `code` is a stable identifier the client translates into the user's language (see [Error codes](#error-codes)).
- **Ownership**: the user always comes from the token, never from the body. An item that belongs
  to another user is answered with 404, as if it did not exist.
- **Month filter**: `month=YYYY-MM` covers Vietnam time (UTC+7), from the 1st at 00:00 +07:00
  to the 1st of the next month at 00:00 +07:00.
  Example `2026-10` → `2026-09-30T17:00:00.000Z` ≤ date < `2026-10-31T17:00:00.000Z`.
- **Dates** are ISO 8601 strings; the server stores them in UTC.
- **Limits** (per IP address, counted in the memory of the server, so they start again after a restart):
  300 requests per 15 minutes to `/api` (`/api/health` is free) and 20 requests per 15 minutes to
  `POST /auth/login`, `POST /auth/register` + `POST /auth/demo` (each has its own counter). More gets 429 `RATE_LIMITED`. A JSON body can be at most 100 kB
  (300 kB for `POST /transactions/import`); a bigger one gets 413 `PAYLOAD_TOO_LARGE`.
- **Input safety**: a body key that starts with `$` or contains `.`, or a query key that starts with `$` or contains `[`
  (for example `?month[$ne]=x`), gets 400 `INVALID_INPUT`. Besides that, every route turns each field into the type it
  expects (string, number, ObjectId) before it reaches the database; a query value sent twice (`?month=a&month=b`) is refused.
- **Security headers** (helmet) are on every answer, and answers are gzip-compressed when the client accepts it.
- **Updates** use PATCH: send only the fields you want to change (at least one). The exception is
  `PUT /recurring/:id`, which replaces the whole rule.

### Status codes

| Code | When |
|------|------|
| 200 | OK (read, update, delete) |
| 201 | Created |
| 400 | Invalid input (validation failed, unknown field value, bad format, body that is not valid JSON → `"Invalid JSON body"`) |
| 401 | Missing/invalid/expired token (also a token made before the password changed or "log out of all devices", or of a deleted account), wrong email or password at login |
| 403 | Signed in but not allowed: not an admin on `/api/admin/*` (`FORBIDDEN`), a disabled account at login (`ACCOUNT_DISABLED`), an admin trying to disable himself or another admin, or the demo account changing its password, logging out of all devices or deleting itself (`DEMO_READ_ONLY`) |
| 404 | Not found, belongs to another user, malformed `:id` in the URL, or unknown route (`"Route not found"`) |
| 409 | Duplicate (email, category name, budget of the same category and month, two transactions of one recurring rule on the same date) or conflict (category still has transactions or recurring rules) |
| 413 | JSON body bigger than 100 kB (300 kB for the CSV import) → `PAYLOAD_TOO_LARGE` |
| 429 | Too many requests from one IP address → `RATE_LIMITED` |
| 503 | `POST /auth/demo` when the demo account has not been seeded → `DEMO_UNAVAILABLE` |
| 500 | Server error (the answer never holds a stack trace; the details go to the server log) |

### Error codes

Every error has a `code`. A code never changes meaning, so the client can show its own translation of
`errors.<code>` (see `client/src/locales/*.json`); for a code it does not know it shows `message`.
When the place that throws an error names no specific code, the status gives a default:
400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 500 `INTERNAL_ERROR`.

| Status | Codes |
|--------|-------|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `NAME_REQUIRED`, `NAME_TOO_LONG`, `EMAIL_INVALID`, `PASSWORD_REQUIRED`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `CURRENT_PASSWORD_REQUIRED`, `NEW_PASSWORD_TOO_SHORT`, `PASSWORD_UNCHANGED`, `WRONG_PASSWORD`, `TYPE_INVALID`, `TYPE_LOCKED`, `COLOR_INVALID`, `ICON_INVALID`, `CATEGORY_REQUIRED`, `AMOUNT_INVALID`, `CURRENCY_INVALID`, `NOTE_TOO_LONG`, `DATE_INVALID`, `TAG_INVALID`, `TOO_MANY_TAGS`, `MONTH_INVALID`, `BUDGET_EXPENSE_ONLY`, `END_BEFORE_START`, `TARGET_INVALID`, `DEADLINE_IN_PAST`, `WITHDRAW_TOO_MUCH`, `DEPOSIT_IN_USE`, `IMPORT_TOO_MANY_ROWS`, `STATUS_INVALID`, `INVALID_INPUT` |
| 401 | `TOKEN_MISSING`, `TOKEN_INVALID`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN`, `ACCOUNT_DISABLED`, `CANNOT_DISABLE_SELF`, `CANNOT_DISABLE_ADMIN`, `DEMO_READ_ONLY` |
| 404 | `USER_NOT_FOUND`, `ROUTE_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `TRANSACTION_NOT_FOUND`, `BUDGET_NOT_FOUND`, `RULE_NOT_FOUND`, `GOAL_NOT_FOUND`, `CONTRIBUTION_NOT_FOUND`, `TEMPLATE_NOT_FOUND`, `NOTIFICATION_NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, `CATEGORY_EXISTS`, `CATEGORY_IN_USE`, `CATEGORY_HAS_RULES`, `BUDGET_EXISTS`, `DUPLICATE_VALUE` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |
| 503 | `DEMO_UNAVAILABLE` |

Example: `{ "success": false, "message": "Email is already registered", "code": "EMAIL_TAKEN" }`.
The tables below list the `message` of each endpoint; the matching code is in the table above.

### Validation rules

| Field | Rule |
|-------|------|
| `name` (user) | string, trimmed, 1–50 chars |
| `email` | valid email, stored lowercase, unique |
| `password` (register) | string, 6–72 chars (72 = bcrypt limit) |
| `newPassword` (change password) | string, 8–72 chars, different from `currentPassword` |
| `name` (category) | string, trimmed, 1–30 chars, unique per user + type (case-insensitive) |
| `type` | `"income"` or `"expense"` |
| `color` | hex `#RRGGBB` |
| `icon` (category) | optional; an icon name from the app's icon set (e.g. `utensils`, `bus`, `receipt`, `banknote`; the full list is `server/src/utils/categoryIcons.js`) or, for older clients, exactly one emoji (e.g. `🍜`). `null` or `""` means no icon: the client then picks an icon from the name. Default categories get an icon name |
| `categoryId` | valid ObjectId of one of the user's categories |
| `amount` | JSON number > 0 (a string like `"45000"` is refused) |
| `currency` (transaction body) | 3 letters (ISO 4217); lower case is converted to upper case; default `"VND"` |
| `currency` (stats query) | 3 **uppercase** letters; lower case like `usd` is refused with 400; default `"VND"` |
| `note` | string, trimmed, max 200 chars, optional, default `""` |
| `tags` | array of up to 5 tags, optional, default `[]`. Each tag is trimmed, converted to lower case, 1–20 characters of `a-z 0-9 -`; duplicates are removed |
| `date` | ISO 8601 date, default: now |
| `month` (query) | `YYYY-MM` |
| `month` (budget body) | `YYYY-MM`, required; cannot be changed after the budget is created |
| `categoryId` (budget body) | valid ObjectId of one of the user's **expense** categories |
| `amount` (budget body) | JSON number > 0, the limit in VND |
| `frequency` (recurring body) | `"weekly"` or `"monthly"`, required |
| `startDate` (recurring body) | a day that exists, `YYYY-MM-DD` in Vietnam time, required |
| `name` (template) | string, trimmed, 1–40 chars |
| `ids` (bulk body) | array of 1–200 transaction ids (24-hex strings); duplicates are removed; more than 200 → 400 |
| `endDate` (recurring body) | a day that exists, `YYYY-MM-DD`, after `startDate`; optional, `null` or left out means no end |

## Endpoint summary

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | `/api/health` | No | Server health check |
| 2 | POST | `/api/auth/register` | No | Create an account, returns a token |
| 3 | POST | `/api/auth/login` | No | Log in, returns a token |
| 4 | GET | `/api/auth/me` | Yes | Current user profile |
| 5 | GET | `/api/categories` | Yes | List my categories (`?type=`) |
| 6 | POST | `/api/categories` | Yes | Create a category |
| 7 | GET | `/api/categories/:id` | Yes | Get one category |
| 8 | PATCH | `/api/categories/:id` | Yes | Update name / color |
| 9 | DELETE | `/api/categories/:id` | Yes | Delete (409 if it has transactions or recurring rules) |
| 10 | GET | `/api/transactions` | Yes | List my transactions, paginated (`?month=&from=&to=&type=&categoryId=&tag=&q=&sort=&page=&limit=`) |
| 11 | POST | `/api/transactions` | Yes | Create a transaction |
| 12 | GET | `/api/transactions/:id` | Yes | Get one transaction |
| 13 | PATCH | `/api/transactions/:id` | Yes | Update a transaction |
| 14 | DELETE | `/api/transactions/:id` | Yes | Delete a transaction |
| 15 | GET | `/api/stats/summary` | Yes | Month totals, expense per category, last 6 months (`?month=&currency=`) |
| 16 | GET | `/api/budgets` | Yes | List my budgets of a month with spent / remaining / percent / status (`?month=`) |
| 17 | POST | `/api/budgets` | Yes | Create a budget for an expense category and month |
| 18 | PATCH | `/api/budgets/:id` | Yes | Change the amount of a budget |
| 19 | DELETE | `/api/budgets/:id` | Yes | Delete a budget |
| 20 | POST | `/api/budgets/copy` | Yes | Copy my budgets from one month to another |
| 21 | GET | `/api/transactions/export` | Yes | Download my transactions as a CSV file, same filters as endpoint 10 without `page` / `limit` (max 5000 rows) |
| 22 | POST | `/api/transactions/import` | Yes | Import up to 500 rows read from a CSV file; valid rows are saved, bad rows are listed |
| 23 | GET | `/api/tags` | Yes | The tags I have used, with how many transactions carry each |
| 24 | GET | `/api/recurring` | Yes | List my recurring rules |
| 25 | POST | `/api/recurring` | Yes | Create a recurring rule |
| 26 | PUT | `/api/recurring/:id` | Yes | Replace a recurring rule |
| 27 | PATCH | `/api/recurring/:id/toggle` | Yes | Turn a rule on or off |
| 28 | DELETE | `/api/recurring/:id` | Yes | Delete a rule (its transactions are kept) |
| 29 | GET | `/api/goals` | Yes | List my savings goals with progress (no history) |
| 30 | POST | `/api/goals` | Yes | Create a goal |
| 31 | GET | `/api/goals/:id` | Yes | Get one goal with its contribution history |
| 32 | PUT | `/api/goals/:id` | Yes | Replace name, target, deadline and color |
| 33 | DELETE | `/api/goals/:id` | Yes | Delete a goal and its history |
| 34 | POST | `/api/goals/:id/contributions` | Yes | Add money (amount > 0) or withdraw money (amount < 0) |
| 35 | DELETE | `/api/goals/:id/contributions/:contributionId` | Yes | Delete a contribution entered by mistake |
| 36 | GET | `/api/reports/monthly` | Yes | One month with last month's comparison, top categories, daily expense, top tags (`?month=&currency=`) |
| 37 | GET | `/api/reports/yearly` | Yes | Income and expense of the 12 months of a year (`?year=&currency=`) |
| 38 | GET | `/api/insights` | Yes | Up to 6 rule-based tips about a month (`?month=&currency=`) |
| 39 | GET | `/api/templates` | Yes | List my transaction templates |
| 40 | POST | `/api/templates` | Yes | Create a template (name, category, amount, note) |
| 41 | GET | `/api/templates/:id` | Yes | Get one template |
| 42 | PATCH | `/api/templates/:id` | Yes | Update a template |
| 43 | DELETE | `/api/templates/:id` | Yes | Delete a template |
| 44 | POST | `/api/transactions/bulk-delete` | Yes | Delete up to 200 of my transactions at once |
| 45 | PATCH | `/api/transactions/bulk-category` | Yes | Move up to 200 of my transactions to another category |
| 46 | GET | `/api/notifications` | Yes | List my notifications, newest first (`?unread=&page=&limit=`) |
| 47 | GET | `/api/notifications/unread-count` | Yes | How many notifications I have not read |
| 48 | PATCH | `/api/notifications/read-all` | Yes | Mark all my notifications as read |
| 49 | PATCH | `/api/notifications/:id/read` | Yes | Mark one notification as read |
| 50 | DELETE | `/api/notifications/:id` | Yes | Delete a notification |
| 51 | PATCH | `/api/users/me/preferences` | Yes | Change theme, first day of the week, language and the notification switches |
| 52 | PATCH | `/api/users/me` | Yes | Change my name |
| 53 | PATCH | `/api/users/me/password` | Yes | Change my password (logs out the other devices, returns a new token) |
| 54 | POST | `/api/auth/logout-all` | Yes | Log out of all devices (returns a new token for this one) |
| 55 | GET | `/api/users/me/export` | Yes | Download all my data as JSON |
| 56 | DELETE | `/api/users/me` | Yes | Delete my account and all my data (password needed) |
| 57 | GET | `/api/admin/stats` | Admin | Totals and the last 30 days: users, active users, transactions |
| 58 | GET | `/api/admin/users` | Admin | List the accounts with their number of transactions (`?q=&page=&limit=`) |
| 59 | PATCH | `/api/admin/users/:id/status` | Admin | Disable or enable an account |
| 60 | POST | `/api/auth/demo` | No | Sign in to the shared demo account (the "Try the demo" button) |

Every protected route (Auth = Yes) can also return **401** (`"Not authorized, token missing"` /
`"Not authorized, invalid token"`) and every route can return **500** (`"Internal server error"`).
These are not repeated below.

---

## Health

### 1. GET /api/health
Auth: no.

**200**
```json
{ "success": true }
```
(No `data` field.)

---

## Auth

### 2. POST /api/auth/register
Auth: no.

**Body**
```json
{ "name": "Minh Tri", "email": "tri@example.com", "password": "secret123" }
```

**201**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "6720a1b2c3d4e5f601234567",
      "name": "Minh Tri",
      "email": "tri@example.com",
      "createdAt": "2026-10-27T03:00:00.000Z",
      "updatedAt": "2026-10-27T03:00:00.000Z"
    }
  }
}
```
`passwordHash` is never returned.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Name is required"`, `"Name must be at most 50 characters"`, `"Email is invalid"`, `"Password must be at least 6 characters"`, `"Password must be at most 72 characters"` |
| 409 | `"Email is already registered"` |

A new account also gets 7 default categories (Food, Transport, Shopping, Bills, Entertainment, Salary, Other Income).

### 3. POST /api/auth/login
Auth: no.

**Body**
```json
{ "email": "tri@example.com", "password": "secret123" }
```

**200** – same `data` shape as register (`token` + `user`).

**Errors**

| Code | message |
|------|---------|
| 400 | `"Email is invalid"`, `"Password is required"` |
| 401 | `"Invalid email or password"` (same message for unknown email and wrong password) |
| 403 | `"Account disabled"` (`ACCOUNT_DISABLED`): the password is right but an admin disabled the account. The password is checked first, so someone who does not know it cannot find out that an account is disabled |

### 60. POST /api/auth/demo
Auth: no. No body. Signs in to the shared demo account (`demo@example.com`) without a password: this is the "Try the demo" button of the
landing page. The account is made by `cd server && npm run seed` (see below). It shares the rate limit of login and register.

**200** – same shape as login: `data` is `{ "token": "...", "user": { ..., "isDemo": true } }`.

**Errors**

| Code | message |
|------|---------|
| 429 | `RATE_LIMITED` |
| 503 | `"Demo account is not available"` (`DEMO_UNAVAILABLE`): the account has not been seeded on this server (or an admin disabled it) |

The demo account is full of sample data (10 categories with icons, about 90 transactions in the current month and the two before,
budgets of the current month with one over 100% and one over 80%, two monthly recurring rules Rent and Salary that make their own
transactions, two savings goals, three templates and a few notifications). Everything else works as for any user, except three actions
that would lock out the next visitor or destroy the account. They answer **403** `"Not available in the demo account"` (`DEMO_READ_ONLY`):
`PATCH /users/me/password` (53), `POST /auth/logout-all` (54) and `DELETE /users/me` (56).

**Seed**: `cd server && npm run seed` connects to `MONGODB_URI` and the password of the account comes from `DEMO_PASSWORD` in `server/.env`.
It deletes and makes again only the documents of the demo user (the user document stays), so it is safe to run twice; run it again any time to
move the sample dates up to today. Playwright's API (`npm run start:e2e`) seeds the same data in its in-memory database.

### 4. GET /api/auth/me
Auth: yes. No body.

**200**
```json
{
  "success": true,
  "data": {
    "_id": "6720a1b2c3d4e5f601234567",
    "name": "Minh Tri",
    "email": "tri@example.com",
    "role": "user",
    "status": "active",
    "preferences": {
      "theme": "system",
      "weekStartsOn": "monday",
      "notifications": { "budget": true, "goals": true, "recurring": true, "weekly": true }
    },
    "createdAt": "2026-10-27T03:00:00.000Z",
    "updatedAt": "2026-10-27T03:00:00.000Z"
  }
}
```

**Errors**: 401 also if the user in the token no longer exists or the account is disabled.

`role` is `"user"` or `"admin"`; the app shows the Admin page only to an admin. Every user object (register, login, `me`) carries `role`, `status` and `isDemo`.
`isDemo` is `true` only for the shared demo account (`demo@example.com`); the app then hides the Password, Sessions and Danger zone settings.

`preferences.language` is only there after the user picked a language. The token version (`tokenVersion`) never leaves the server.

Logout of this device: no endpoint, the client deletes the token from localStorage. To end the session on every device, use
`POST /auth/logout-all` (endpoint 54).

### How a token stops working
The token holds `sub` (user id) and `tv` (token version). On every protected request `requireAuth` checks the signature,
reads the user and compares `tv` with `User.tokenVersion`. A different version, or a user that no longer exists, is a
**401** `TOKEN_INVALID`. Changing the password and `logout-all` raise the version by 1, so every older token is refused at once.
A token made before this field existed has no `tv` and counts as version 0.

---

## Categories

Category object:
```json
{
  "_id": "6720b1b2c3d4e5f601234568",
  "name": "Food",
  "type": "expense",
  "color": "#FF7043",
  "createdAt": "2026-10-27T03:05:00.000Z",
  "updatedAt": "2026-10-27T03:05:00.000Z"
}
```
(`userId` is not returned.)

### 5. GET /api/categories
Auth: yes.

**Query**: `type` (optional) = `income` | `expense`. Sorted by `type`, then `name`.

**200**
```json
{ "success": true, "data": [ { "_id": "...", "name": "Food", "type": "expense", "color": "#FF7043", "icon": "utensils", "createdAt": "...", "updatedAt": "..." } ] }
```

**Errors**: 400 `"Type must be income or expense"`.

### 6. POST /api/categories
Auth: yes.

**Body**
```json
{ "name": "Food", "type": "expense", "color": "#FF7043", "icon": "utensils" }
```
`icon` is optional: an icon name or one emoji.

**201** – `data` is the new category object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Name is required"`, `"Name must be at most 30 characters"`, `"Type must be income or expense"`, `"Color must be a hex code like #FF7043"`, `"Icon must be an icon name or a single emoji"` |
| 409 | `"Category already exists"` (same name + type for this user, case-insensitive) |

### 7. GET /api/categories/:id
Auth: yes.

**200** – `data` is the category object.

**Errors**: 404 `"Category not found"`.

### 8. PATCH /api/categories/:id
Auth: yes.

**Body** (at least one field)
```json
{ "name": "Eating out", "color": "#E53935", "icon": "pizza" }
```
`icon: null` (or `""`) removes the icon.
`type` cannot be changed (it is copied into every transaction of this category).

**200** – `data` is the updated category object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"`, `"Type cannot be changed"` (any `type` in the body, even the same value), `"Name is required"`, `"Name must be at most 30 characters"`, `"Color must be a hex code like #FF7043"`, `"Icon must be an icon name or a single emoji"` |
| 404 | `"Category not found"` |
| 409 | `"Category already exists"` |

### 9. DELETE /api/categories/:id
Auth: yes.

**200**
```json
{ "success": true, "data": { "_id": "6720b1b2c3d4e5f601234568" } }
```

**Errors**

| Code | message |
|------|---------|
| 404 | `"Category not found"` |
| 409 | `"Category still has transactions"` |
| 409 | `"Category still has recurring rules"` (also when the rule is turned off) |

When the delete succeeds, the budgets of the category (every month) and its transaction templates are deleted with it.

---

## Transactions

Transaction object (category populated for display):
```json
{
  "_id": "6720c1b2c3d4e5f601234569",
  "category": { "_id": "6720b1b2c3d4e5f601234568", "name": "Food", "color": "#FF7043" },
  "type": "expense",
  "amount": 45000,
  "currency": "VND",
  "note": "Lunch",
  "tags": ["work"],
  "date": "2026-10-27T05:30:00.000Z",
  "createdAt": "2026-10-27T05:31:00.000Z",
  "updatedAt": "2026-10-27T05:31:00.000Z"
}
```
(Stored as `categoryId` in MongoDB, returned as `category` via `populate`.)

### 10. GET /api/transactions
Auth: yes.

**Query** (all optional)

| Param | Example | Note |
|-------|---------|------|
| `month` | `2026-10` | `YYYY-MM`, Vietnam time. Used when neither `from` nor `to` is sent; default: current month |
| `from` | `2026-10-01` | `YYYY-MM-DD`, first day included, from 00:00 +07:00 |
| `to` | `2026-10-31` | `YYYY-MM-DD`, last day included (until 00:00 +07:00 of the next day) |
| `type` | `expense` | `income` \| `expense` |
| `categoryId` | `6720b1b2...` | |
| `tag` | `work` | only transactions that have this tag; one tag, upper case is converted to lower case |
| `q` | `lunch` | search in `note`, ignores upper / lower case; trimmed, empty is ignored, max 100 characters |
| `sort` | `-amount` | `date`, `-date` (default), `amount`, `-amount` (`-` = descending) |
| `page` | `2` | whole number ≥ 1, default `1` |
| `limit` | `20` | whole number 1–100, default `20` |

- `month` cannot be sent together with `from` / `to` (400). `from` alone has no end, `to` alone has no start.
- All the filters are combined (AND).
- `q` is matched as plain text: `(` or `.` are not regex syntax. Accents are not ignored (`an` does not find `ăn`).
- Ties keep a fixed order so pages never overlap: `-date` = date, createdAt, `_id` descending (the old order);
  `date` = the same ascending; `amount` / `-amount` = amount, then date and `_id` descending.
- `meta.totalPages` = `Math.ceil(total / limit)`, `0` when nothing matches. A page after the last one returns `data: []`.

**200** – `data` is one page (still an array), `meta` describes the pages
```json
{
  "success": true,
  "data": [ { "_id": "...", "category": { "_id": "...", "name": "Food", "color": "#FF7043" }, "type": "expense", "amount": 45000, "currency": "VND", "note": "Lunch", "date": "...", "createdAt": "...", "updatedAt": "..." } ],
  "meta": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 }
}
```

**Errors** (400)
- `"Use either month or from/to, not both"`, `"Month must be in YYYY-MM format"`
- `"From must be a date in YYYY-MM-DD format"`, `"To must be a date in YYYY-MM-DD format"` (also for days that do not exist like `2026-02-30`), `"From must be before or equal to to"`
- `"Type must be income or expense"`, `"Category id is invalid"`
- `"Each tag must be 1-20 letters, digits or hyphens"` (bad `tag`, e.g. `work!` or an empty `?tag=`)
- `"Search must be a string"` (e.g. `?q=a&q=b`), `"Search must be at most 100 characters"`
- `"Sort must be one of date, -date, amount, -amount"`
- `"Page must be a whole number from 1"`, `"Limit must be a whole number from 1 to 100"`

### 11. POST /api/transactions
Auth: yes.

**Body**
```json
{
  "categoryId": "6720b1b2c3d4e5f601234568",
  "amount": 45000,
  "currency": "VND",
  "note": "Lunch",
  "tags": ["work", "team-lunch"],
  "date": "2026-10-27T12:30:00+07:00"
}
```
Required: `categoryId`, `amount`. `type` is not sent: the server copies it from the category.

**201** – `data` is the new transaction object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Category id is invalid"`, `"Amount must be greater than 0"`, `"Currency must be a 3-letter ISO code"`, `"Note must be a string"`, `"Note must be at most 200 characters"`, `"Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00"`, `"Tags must be an array"`, `"Each tag must be 1-20 letters, digits or hyphens"`, `"A transaction can have at most 5 tags"` |
| 404 | `"Category not found"` |

### 12. GET /api/transactions/:id
Auth: yes.

**200** – `data` is the transaction object.

**Errors**: 404 `"Transaction not found"`.

### 13. PATCH /api/transactions/:id
Auth: yes.

**Body** (at least one of `categoryId`, `amount`, `currency`, `note`, `tags`, `date`)
```json
{ "amount": 50000, "note": "Lunch with friends" }
```
If `categoryId` changes, `type` is copied again from the new category.
`tags` replaces all the tags of the transaction; `[]` removes them.

**200** – `data` is the updated transaction object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"` + same validation messages as create |
| 404 | `"Transaction not found"`, `"Category not found"` |
| 409 | `"Duplicate value"` (the new date is already used by another transaction of the same recurring rule) |

### 14. DELETE /api/transactions/:id
Auth: yes.

**200**
```json
{ "success": true, "data": { "_id": "6720c1b2c3d4e5f601234569" } }
```

**Errors**: 404 `"Transaction not found"`.

### 21. GET /api/transactions/export
Auth: yes. Declared **before** `/api/transactions/:id`, so `export` is never read as an id.

**Query**: the same filters as endpoint 10 (`month`, `from`, `to`, `type`, `categoryId`, `tag`, `q`, `sort`), with the same rules.
`page` and `limit` are ignored (even if invalid). At most **5000 rows**; if more match, only the first 5000 of the chosen sort are in the file.

**200** – a file, not JSON
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="ledgerling-2026-10.csv"` – `ledgerling-YYYY-MM.csv` for a month (default: current month),
  `ledgerling-FROM_TO.csv` for a date range (`start` / `end` when one side is missing)
- Columns: `Date` (Vietnam time, `YYYY-MM-DD HH:mm`), `Type`, `Category`, `Amount`, `Currency`, `Note`, `Tags` (the tags of the transaction joined with `;`, empty when none)
- Starts with a UTF-8 BOM; lines end with CRLF
- A cell with a comma, a double quote or a line break is wrapped in `"` (each `"` inside is doubled)
- A cell that starts with `=`, `+`, `-`, `@` (or a tab / carriage return) gets a `'` in front, so a spreadsheet does not run it as a formula (CSV injection)

```
Date,Type,Category,Amount,Currency,Note,Tags
2026-10-27 12:30,expense,Food,45000,VND,Lunch,work
2026-10-27 18:30,expense,Food,85000,VND,"Dinner, with team",work;trip
```

**Errors** (400): the same as endpoint 10 for the filters (nothing for `page` / `limit`). The error body is JSON as usual.

### 22. POST /api/transactions/import
Auth: yes. Declared **before** `/api/transactions/:id`.

The browser reads the CSV file (papaparse) and sends its rows as JSON, so the file itself is never uploaded.
Every row is checked like a new transaction (endpoint 11); the category is found by **name and type** among the
user's categories, ignoring upper / lower case. A category that does not exist (or has the other type) is an error for
that row: an import never creates categories. Only the valid rows are saved.

**Body** – `rows`: 1 to 500 items
```json
{
  "rows": [
    { "date": "2026-10-27 12:30", "type": "expense", "category": "Food", "amount": 45000, "currency": "VND", "note": "Lunch", "tags": ["work"] },
    { "date": "2026-10-28", "type": "expense", "category": "Unknown", "amount": 10000 }
  ]
}
```

| Field of a row | Rule |
|----------------|------|
| `type` | required, `income` or `expense` |
| `category` | required, the name of one of the user's categories of this `type` |
| `amount` | required, JSON number > 0 |
| `date` | `YYYY-MM-DD HH:mm` or `YYYY-MM-DD` (Vietnam time, the export format; a day alone is 00:00), or ISO 8601 with an offset; empty = now |
| `currency`, `note`, `tags` | as in endpoint 11; empty = the default (`VND`, `""`, `[]`) |

An empty value (`""` or `null`) counts as missing. `userId` and any other field in a row are ignored.

**200** – also when some rows are refused (a partial import is not an error). `errors[].row` is the position of the row in `rows` (1 = the first row).
```json
{
  "success": true,
  "data": {
    "imported": 1,
    "failed": 1,
    "errors": [ { "row": 2, "message": "Category \"Unknown\" (expense) not found",
                  "code": "IMPORT_CATEGORY_NOT_FOUND", "params": { "name": "Unknown", "type": "expense" } } ]
  }
}
```

**Errors**

| Code | message |
|------|---------|
| 400 | `"Rows must be a non-empty array"`, `"You can import at most 500 rows at a time"` |

Row messages (in `errors`): the validation messages of endpoint 11 (`"Amount must be greater than 0"`, tags messages...),
`"Type must be income or expense"`, `"Category is required"`, `"Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601"`,
`"Row must be an object"` and `"Category \"X\" (expense) not found"`.
Every row error also has a `code` (the codes of the table above, plus `IMPORT_CATEGORY_NOT_FOUND` with `params: { name, type }`).
Sending the same rows twice saves them twice (no duplicate check). The JSON body limit is 300 kB.

### 23. GET /api/tags
Auth: yes. Used for the tag suggestions in the transaction form.

**200** – the tags the user has used (on all transactions, any month), most used first, then A to Z. `[]` when none.
```json
{ "success": true, "data": [ { "tag": "work", "count": 12 }, { "tag": "trip", "count": 3 } ] }
```

---

## Stats

### 15. GET /api/stats/summary
Auth: yes. Data for the dashboard cards and charts (Recharts), computed with MongoDB aggregation.

**Query** (all optional)

| Param | Default | Note |
|-------|---------|------|
| `month` | current month (Vietnam time) | `YYYY-MM` |
| `currency` | `VND` | 3 uppercase letters; only transactions in this currency are summed |

**200**
```json
{
  "success": true,
  "data": {
    "month": "2026-10",
    "currency": "VND",
    "totalIncome": 21500000,
    "totalExpense": 13600000,
    "balance": 7900000,
    "expenseByCategory": [
      { "categoryId": "6720b1b2c3d4e5f601234568", "name": "Food", "color": "#F07D62", "total": 4800000 },
      { "categoryId": "6720b1b2c3d4e5f601234571", "name": "Bills", "color": "#F19A52", "total": 3200000 },
      { "categoryId": "6720b1b2c3d4e5f601234572", "name": "Shopping", "color": "#7D8CE8", "total": 2600000 },
      { "categoryId": "6720b1b2c3d4e5f601234573", "name": "Transport", "color": "#4A9FE3", "total": 1700000 },
      { "categoryId": "6720b1b2c3d4e5f601234574", "name": "Entertainment", "color": "#22ADA3", "total": 1300000 }
    ],
    "byMonth": [
      { "month": "2026-05", "income": 18500000, "expense": 12100000 },
      { "month": "2026-06", "income": 18500000, "expense": 14800000 },
      { "month": "2026-07", "income": 21000000, "expense": 13200000 },
      { "month": "2026-08", "income": 18500000, "expense": 16400000 },
      { "month": "2026-09", "income": 19200000, "expense": 11900000 },
      { "month": "2026-10", "income": 21500000, "expense": 13600000 }
    ]
  }
}
```
- `balance` = `totalIncome` − `totalExpense` of the month.
- `expenseByCategory`: expense categories only, sorted by `total` descending (then name). Categories with no
  expense in the month are left out.
- `byMonth`: always 6 entries, oldest first, ending with `month` (for `2026-03`: `2025-10` … `2026-03`). A month
  without transactions has `0`. The last entry has the same numbers as `totalIncome` / `totalExpense`.
- Every transaction counts in its month in Vietnam time: `2026-11-01T00:30:00+07:00` is November, although it is
  still October 31 in UTC.

**Errors**: 400 `"Month must be in YYYY-MM format"`, `"Currency must be a 3-letter ISO code"` (also for lower case
like `usd`).

---

## Budgets

A budget is a monthly spending limit (in VND) for one expense category. Unique per user + category + month.

Budget object (category populated, progress computed by the server):
```json
{
  "_id": "6720d1b2c3d4e5f601234581",
  "category": { "_id": "6720b1b2c3d4e5f601234568", "name": "Food", "color": "#F07D62" },
  "month": "2026-10",
  "amount": 5000000,
  "spent": 4250000,
  "remaining": 750000,
  "percent": 85,
  "status": "warning",
  "createdAt": "2026-10-01T02:01:00.000Z",
  "updatedAt": "2026-10-01T02:01:00.000Z"
}
```
- `spent`: total of the category's **VND expense** transactions in the month (Vietnam time). Other currencies are not counted.
- `remaining` = `amount` − `spent` (negative when over budget).
- `percent` = `spent / amount × 100`, rounded to 1 decimal (e.g. `85.3`).
- `status`: `"ok"` (below 80%), `"warning"` (80% up to 100%), `"over"` (100% or more). It uses the exact ratio, so
  79.96% shows `percent: 80` but is still `"ok"`.
- `GET /api/budgets` computes `spent` of all the budgets with one MongoDB aggregation (expense transactions grouped by `categoryId`).
- `userId` is not returned. Stored as `categoryId`, returned as `category`.

### 16. GET /api/budgets
Auth: yes.

**Query** (optional): `month` = `YYYY-MM`, default: current month in Vietnam time.

Sorted by category name. A month without budgets returns `[]`.

**200** – `data` is an array of budget objects.

**Errors**: 400 `"Month must be in YYYY-MM format"`.

### 17. POST /api/budgets
Auth: yes.

**Body**
```json
{ "categoryId": "6720b1b2c3d4e5f601234568", "month": "2026-10", "amount": 5000000 }
```

**201** – `data` is the new budget object (with `spent`, `remaining`, `percent`, `status`).

**Errors**

| Code | message |
|------|---------|
| 400 | `"Category id is invalid"`, `"Month must be in YYYY-MM format"`, `"Amount must be greater than 0"`, `"Budgets are only for expense categories"` |
| 404 | `"Category not found"` (does not exist or belongs to another user) |
| 409 | `"Budget already exists for this category and month"` |

### 18. PATCH /api/budgets/:id
Auth: yes.

**Body** (only the amount can change)
```json
{ "amount": 6000000 }
```

**200** – `data` is the updated budget object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"`, `"Only the amount can be changed"` (any `categoryId` or `month` in the body), `"Amount must be greater than 0"` |
| 404 | `"Budget not found"` (also for another user's budget or a malformed id) |

### 19. DELETE /api/budgets/:id
Auth: yes. Transactions are not touched.

**200**
```json
{ "success": true, "data": { "_id": "6720d1b2c3d4e5f601234581" } }
```

**Errors**: 404 `"Budget not found"`.

### 20. POST /api/budgets/copy
Auth: yes.

Creates, in `toMonth`, a budget with the same category and amount for every budget of `fromMonth`.
A category that already has a budget in `toMonth` is skipped (its amount is not changed).

**Body**
```json
{ "fromMonth": "2026-09", "toMonth": "2026-10" }
```

**200** – `data.copied` is the number of budgets created. It is `0` when `fromMonth` has no budgets or
every category already has one in `toMonth`.
```json
{ "success": true, "data": { "copied": 3 } }
```

**Errors**

| Code | message |
|------|---------|
| 400 | `"From month must be in YYYY-MM format"`, `"To month must be in YYYY-MM format"`, `"From month and to month must be different"` |

---

## Recurring

A rule creates real transactions by itself, weekly or monthly. The rule has no currency: its transactions are in VND.

Rule object (category populated):
```json
{
  "_id": "6720e1b2c3d4e5f601234590",
  "category": { "_id": "6720b1b2c3d4e5f601234571", "name": "Bills", "color": "#F19A52", "type": "expense" },
  "amount": 3500000,
  "note": "Rent",
  "frequency": "monthly",
  "startDate": "2026-08-31T05:00:00.000Z",
  "nextRunDate": "2026-11-30T05:00:00.000Z",
  "endDate": null,
  "active": true,
  "ended": false,
  "createdAt": "2026-08-31T02:01:00.000Z",
  "updatedAt": "2026-10-31T02:01:00.000Z"
}
```
- All dates of a rule are stored at noon Vietnam time, so one day is always exactly one `Date`.
- `ended` is computed: `true` when `nextRunDate` is after `endDate`, so the rule will not run again.
- `userId` is not returned. Stored as `categoryId`, returned as `category`.

### How the transactions are created
There is no cron job, because the free Render server sleeps when nobody is using it. Instead,
`GET /api/transactions`, `GET /api/stats/summary`, `GET /api/budgets` and `GET /api/recurring` first call
`processDueRules(userId)`, which goes through the user's active rules:
- It creates a transaction for every date from `nextRunDate` up to today (Vietnam time), at most **60 per rule per request**.
  A rule with more due dates continues on the next request.
- A created transaction gets `type` from the category, `note` and `amount` from the rule, `date` = the run date and
  `recurringRuleId` = the rule. `recurringRuleId` can never be set by a client. It stays after the rule is deleted.
- A **monthly** rule always counts from the day of `startDate`: 31 Jan → 28 Feb → 31 Mar. A month that is too short uses its last day.
- A **weekly** rule runs every 7 days.
- `endDate` is the last day that can run. A rule past its end stops, and moving `endDate` later makes it run again.

**Safe when many requests run at once** (the Dashboard alone sends several):
1. A partial unique index on Transaction (`recurringRuleId + date`, only for transactions that have a `recurringRuleId`)
   refuses a second transaction for the same date. The duplicate error (E11000) is ignored.
2. `nextRunDate` moves with `findOneAndUpdate({ _id, active: true, nextRunDate: <the date just used> })`, so only one
   request can move it, and no date is ever skipped.

### 24. GET /api/recurring
Auth: yes. Active rules first, then the rule that runs soonest. No rules returns `[]`.

### 25. POST /api/recurring
Auth: yes.

**Body**
```json
{ "categoryId": "6720b1b2c3d4e5f601234571", "amount": 3500000, "note": "Rent", "frequency": "monthly", "startDate": "2026-08-31", "endDate": null }
```
`note` and `endDate` are optional. A `startDate` in the past is allowed: the missed transactions are created on the next
call of one of the routes above.

**201** – the rule, with `nextRunDate` = `startDate`.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Category id is invalid"`, `"Amount must be greater than 0"`, `"Frequency must be weekly or monthly"`, `"Start date must be a date in YYYY-MM-DD format"`, `"End date must be a date in YYYY-MM-DD format"`, `"End date must be after the start date"`, `"Note must be a string"`, `"Note must be at most 200 characters"` |
| 404 | `"Category not found"` (does not exist or belongs to another user) |

### 26. PUT /api/recurring/:id
Auth: yes. Same body as POST. It replaces the whole rule: a missing `note` becomes empty, a missing `endDate` removes the end date.

Changing `frequency` or `startDate` recalculates `nextRunDate`: the first date of the new schedule **after the last
transaction the rule created** (`startDate` if it has created none), so changing monthly to weekly does not create
every past week. Transactions already created are never changed.

**200** – the updated rule. **Errors**: same 400 as POST; 404 `"Recurring rule not found"` or `"Category not found"`.

### 27. PATCH /api/recurring/:id/toggle
Auth: yes. No body. A rule that is off creates nothing. Turning it back on skips the dates that passed while it was off:
`nextRunDate` becomes the first date of the schedule from today on.

**200** – the rule with its new `active`. **Errors**: 404 `"Recurring rule not found"`.

### 28. DELETE /api/recurring/:id
Auth: yes. The transactions the rule created are kept.

**200**
```json
{ "success": true, "data": { "_id": "6720e1b2c3d4e5f601234590" } }
```
**Errors**: 404 `"Recurring rule not found"`.

---

## Goals

A savings goal with a target in VND, an optional deadline and a history of contributions.

```json
{
  "_id": "6720f1b2c3d4e5f601234601",
  "name": "New laptop",
  "targetAmount": 20000000,
  "savedAmount": 5000000,
  "deadline": "2027-03-31T05:00:00.000Z",
  "color": "#4A9FE3",
  "progress": 25,
  "remaining": 15000000,
  "completed": false,
  "contributions": [
    { "_id": "6720f1b2c3d4e5f601234611", "amount": 5000000, "note": "October bonus", "date": "2026-10-30T05:00:00.000Z" }
  ],
  "createdAt": "2026-10-30T02:01:00.000Z",
  "updatedAt": "2026-10-30T02:05:00.000Z"
}
```
- `progress`, `remaining` and `completed` are computed, not stored. `progress` is `savedAmount / targetAmount` in %, with
  1 decimal **rounded down** and at most 100, so `100` always means the goal is reached (99.96% shows as `99.9`).
  `remaining` is `targetAmount - savedAmount` and never below 0. `completed` is `savedAmount >= targetAmount`.
- `deadline` and the `date` of a contribution are days in Vietnam time, stored at noon (like recurring rules).
  `deadline` is `null` when the goal has none.
- `GET /api/goals` leaves `contributions` out. Every other route returns the goal with `contributions`, newest first.
- All amounts are **whole numbers** (no decimals), up to 999.999.999.999. This keeps `$inc` exact.
- `userId` is not returned. `savedAmount` can only change through the contribution routes.

### How the saved amount stays correct
A contribution changes `savedAmount` and the history with **one** `findOneAndUpdate`:
`{ _id, userId, savedAmount: { $gte: -amount } }` → `{ $inc: { savedAmount: amount }, $push: { contributions: ... } }`.
- For a deposit (`amount > 0`) the condition is always true.
- For a withdrawal (`amount < 0`) the condition only matches while the goal holds at least `-amount`. A bigger withdrawal
  matches nothing and the API answers 400, so `savedAmount` never goes below 0.
- MongoDB applies one update to a document at a time, so requests sent at the same moment cannot lose an addition,
  and two withdrawals cannot spend the same money.

Deleting a contribution is also one update: `$inc: { savedAmount: -amount }` and `$pull`, with the filter
`{ savedAmount: { $gte: amount }, contributions: { $elemMatch: { _id, amount } } }`. Deleting the same entry twice at
the same moment takes it back only once (the second request gets 404).

### 29. GET /api/goals
Auth: yes. Goals still to reach come first, the nearest `deadline` first (goals without a deadline after them, newest
first). Completed goals come last. No goals returns `[]`. The goals have no `contributions`.

### 30. POST /api/goals
Auth: yes.

**Body**
```json
{ "name": "New laptop", "targetAmount": 20000000, "deadline": "2027-03-31", "color": "#4A9FE3" }
```
`deadline` is optional; when it is sent it must be **after today** (Vietnam time).

**201** – the goal with `savedAmount` 0 and no contributions.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Name is required"`, `"Name must be at most 60 characters"`, `"Target amount must be a whole number greater than 0"`, `"Deadline must be a date in YYYY-MM-DD format"`, `"Deadline must be after today"`, `"Color must be a hex code like #FF7043"` |

### 31. GET /api/goals/:id
Auth: yes. **200** – the goal with its `contributions`, newest first (same day: the last added first).
**Errors**: 404 `"Goal not found"` (does not exist, malformed id, or belongs to another user).

### 32. PUT /api/goals/:id
Auth: yes. Same body as POST. It replaces `name`, `targetAmount`, `deadline` and `color`: a missing `deadline` removes it.
`savedAmount` and the history are not changed (a `savedAmount` in the body is ignored). The deadline is **not** checked
against today here, so a goal whose deadline has passed can still be edited.

**200** – the updated goal. **Errors**: same 400 as POST (except `"Deadline must be after today"`); 404 `"Goal not found"`.

### 33. DELETE /api/goals/:id
Auth: yes. Deletes the goal and its history.

**200**
```json
{ "success": true, "data": { "_id": "6720f1b2c3d4e5f601234601" } }
```
**Errors**: 404 `"Goal not found"`.

### 34. POST /api/goals/:id/contributions
Auth: yes. A positive `amount` adds money, a negative `amount` withdraws it.

**Body**
```json
{ "amount": 500000, "note": "October bonus", "date": "2026-10-30" }
```
`note` (up to 200 characters) and `date` (a day, default today in Vietnam time) are optional.

**201** – the goal with its new `savedAmount`, `progress`, `completed` and `contributions`. Saving more than the target is
allowed: the goal stays completed and `remaining` is 0.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Amount must be a whole number other than 0"`, `"Note must be a string"`, `"Note must be at most 200 characters"`, `"Date must be a date in YYYY-MM-DD format"` |
| 400 | `"You cannot withdraw more than the saved amount"` |
| 404 | `"Goal not found"` |

### 35. DELETE /api/goals/:id/contributions/:contributionId
Auth: yes. Takes a contribution back: deleting a deposit lowers `savedAmount`, deleting a withdrawal raises it.

**200** – the goal with its new `savedAmount` and `contributions`.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Deleting this deposit would make the saved amount negative"` (the money of that deposit was already withdrawn) |
| 404 | `"Goal not found"`, `"Contribution not found"` (also when the id belongs to another goal) |


---

## Reports and insights

Read-only routes for the Reports page and the Dashboard card. Like `GET /transactions`, each one first creates the
transactions of my recurring rules that are due, so their numbers include them. Everything is computed by MongoDB
aggregation. Months and days are read in **Vietnam time (UTC+7)**: an expense at 23:30 on the last day of a month stays
in that month and on that day. Only transactions in one currency are summed (`currency`, default `VND`, 3 **uppercase**
letters), so 10 USD is never added as 10 VND.

### 36. GET /api/reports/monthly
Auth: yes. Query: `month=YYYY-MM` (default: the current month in Vietnam time), `currency` (default `VND`).

**200**
```json
{
  "success": true,
  "data": {
    "month": "2025-10",
    "currency": "VND",
    "totals": { "income": 21500000, "expense": 1250000, "balance": 20250000 },
    "previousMonth": "2025-09",
    "previousTotals": { "income": 18000000, "expense": 1100000, "balance": 16900000 },
    "changes": { "income": 19.4, "expense": 13.6, "balance": 19.8 },
    "topCategories": [
      { "categoryId": "6720b1b2c3d4e5f601234568", "name": "Bills", "color": "#F19A52", "icon": "🧾",
        "total": 1000000, "percent": 80, "previousTotal": 800000, "changePercent": 25 }
    ],
    "dailyExpense": [ { "date": "2025-10-01", "total": 0 }, { "date": "2025-10-02", "total": 0 } ],
    "averagePerDay": 40323,
    "noSpendDays": 27,
    "largestExpense": {
      "_id": "6720c1b2c3d4e5f601234569", "amount": 1000000, "note": "Electricity", "date": "2025-10-10T02:00:00.000Z",
      "category": { "_id": "6720b1b2c3d4e5f601234568", "name": "Bills", "color": "#F19A52", "icon": "🧾" }
    },
    "topTags": [ { "tag": "work", "total": 200000, "count": 2 } ]
  }
}
```
(`dailyExpense` is shortened here: it has one entry for every day of the month.)

| Field | How it is calculated |
|-------|----------------------|
| `totals`, `previousTotals` | Income, expense and `balance = income - expense` of the month and of the month before |
| `changes` | `(current - previous) / abs(previous) * 100`, 1 decimal. **`null` when last month is 0.** A positive `expense` change means more spending |
| `topCategories` | Up to 5 expense categories with an expense this month, biggest first (same total: by name). `percent` = share of the month's expense, 1 decimal. `changePercent` compares with the same category last month (`null` when it was 0). `icon` is the emoji of the category, or `null` when it has none |
| `dailyExpense` | **Every** day of the month in order (28-31 entries); a day without expenses has `total` 0 |
| `averagePerDay` | Expense / days that have started, rounded to a whole number. A past month: all its days. The current month: up to and including today. A future month: 0 |
| `noSpendDays` | Finished days without any expense. Today is not counted (it may still get one). A future month: 0 |
| `largestExpense` | The biggest single expense (the latest when two are equal), or `null` |
| `topTags` | Up to 5 tags with the most expense, `total` = sum of the transactions that carry the tag. A transaction with 2 tags counts in both |

A month without transactions is **not** an error: totals are 0, `changes` are `null`, `topCategories` and `topTags` are
`[]`, `largestExpense` is `null`, `dailyExpense` is all zeros.

**Errors**: 400 `"Month must be in YYYY-MM format"`, `"Currency must be a 3-letter ISO code"`.

### 37. GET /api/reports/yearly
Auth: yes. Query: `year=YYYY` (1970-2100, default: the current year in Vietnam time), `currency` (default `VND`).

**200**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "currency": "VND",
    "months": [
      { "month": "2025-01", "income": 0, "expense": 0, "balance": 0 },
      { "month": "2025-10", "income": 21500000, "expense": 1250000, "balance": 20250000 }
    ],
    "totals": { "income": 39500000, "expense": 2430000, "balance": 37070000 },
    "topExpenseMonth": { "month": "2025-10", "expense": 1250000 }
  }
}
```
(`months` is shortened here: it always has 12 entries, January first, and a month without transactions has 0.)
`topExpenseMonth` is the month with the most expense (the earlier month when two are equal), or `null` when the whole
year has no expenses.

**Errors**: 400 `"Year must be a 4-digit year from 1970 to 2100"`, `"Currency must be a 3-letter ISO code"`.

### 38. GET /api/insights
Auth: yes. Query: `month=YYYY-MM` (default: the current month), `currency` (default `VND`).

**200**
```json
{
  "success": true,
  "data": {
    "month": "2025-10",
    "currency": "VND",
    "insights": [
      { "type": "category-up", "severity": "warning",
        "message": "You spent 200.000 ₫ (25%) more on Bills than last month.",
        "code": "CATEGORY_UP", "params": { "amount": 200000, "percent": 25, "category": "Bills" },
        "link": "/transactions?month=2025-10&category=6720b1b2c3d4e5f601234568" },
      { "type": "savings-rate", "severity": "success",
        "message": "Great! You saved 94% of your income in October 2025.",
        "code": "SAVINGS_GOOD", "params": { "rate": 94, "month": "2025-10", "target": 20 },
        "link": "/reports?tab=monthly&month=2025-10" }
    ]
  }
}
```
Built from simple rules (no AI). `severity` is `info`, `warning` or `success`. The list is sorted warning, success, info and has
**at most 6** items; a month without any income or expense returns `[]`.

| `type` | Condition | `severity` |
|--------|-----------|------------|
| `budget-forecast` | **Current month, VND only.** `spent / days passed * days in month` is above the budget (a budget already used up says so). At most 2 budgets, the biggest overshoot first | warning |
| `category-up` | The category with the biggest increase in money, when it is **+20% or more** from last month (last month must be above 0) | warning |
| `category-down` | The category with the biggest decrease in money, when it is **-20% or less** (a category that dropped to 0 counts) | success |
| `savings-rate` | `(income - expense) / income`: 20% or more | success |
| | 0% to 19% | info |
| | below 0%, or an expense with no income | warning |
| `no-spend-days` | Finished days without an expense: 5 or more | success |
| | 1 to 4 days, or 0 days ("you spent every day") | info |
| `largest-expense` | The biggest single expense of the month, `link` opens its day | info |

`link` is a path inside the app. Amounts in `message` are written like the client does (`1.000.000 ₫`).

`message` is English. `code` and `params` let the client write the sentence in the user's language
(`insights.codes.<code>` in the locale files); amounts in `params` are VND numbers, `month` is `YYYY-MM`, `day` is `YYYY-MM-DD`.

| `code` | `params` |
|--------|----------|
| `CATEGORY_UP`, `CATEGORY_DOWN` | `amount`, `percent`, `category` |
| `BUDGET_OVER`, `BUDGET_FORECAST` | `spent`, `budget`, `projected`, `category` |
| `SAVINGS_GOOD`, `SAVINGS_LOW` | `rate`, `month`, `target` |
| `SAVINGS_NEGATIVE` | `amount`, `month`, `rate` |
| `SAVINGS_NO_INCOME` | `amount`, `month` |
| `NO_SPEND_DAYS` | `count`, `month` |
| `NO_SPEND_NONE` | `month` |
| `LARGEST_EXPENSE` | `amount`, `category`, `day` |

**Errors**: 400 `"Month must be in YYYY-MM format"`, `"Currency must be a 3-letter ISO code"`.

---

## Bulk actions

Both routes act only on the signed-in user's transactions. An id that does not exist or belongs to another user is
skipped without an error (the count is just smaller), so the answer never reveals whether such an id exists.
They are declared before `/transactions/:id`, so `bulk-category` is never read as an id.

### 44. POST /api/transactions/bulk-delete
Auth: yes.

**Body**
```json
{ "ids": ["6720c1b2c3d4e5f601234569", "6720c1b2c3d4e5f60123456a"] }
```

**200**
```json
{ "success": true, "data": { "deleted": 2 } }
```

**Errors**

| Code | message |
|------|---------|
| 400 | `"Ids must be a non-empty array"`, `"You can change at most 200 transactions at a time"` (nothing is deleted), `"Every id must be a valid transaction id"` |

### 45. PATCH /api/transactions/bulk-category
Auth: yes.

**Body**
```json
{ "ids": ["6720c1b2c3d4e5f601234569"], "categoryId": "6720b1b2c3d4e5f601234568" }
```
The `type` of every changed transaction is copied from the new category (an expense moved to an income category becomes income).

**200**
```json
{ "success": true, "data": { "updated": 1 } }
```
`updated` counts the transactions that really changed; one that already had the category is left alone and not counted.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Ids must be a non-empty array"`, `"You can change at most 200 transactions at a time"`, `"Every id must be a valid transaction id"`, `"Category id is invalid"` |
| 404 | `"Category not found"` (does not exist or belongs to another user; nothing is changed) |

---

## Templates

A template is a saved category + amount + note. The quick add dialog shows the templates as chips; a click creates a normal
transaction dated today through `POST /api/transactions` (the server has no special "use template" route).

Template object: `{ "_id", "name", "category": { "_id", "name", "color", "icon", "type" }, "amount", "note", "createdAt", "updatedAt" }`.

### 39. GET /api/templates
Auth: yes. Oldest first. **200** – `data` is an array (empty when there are none).

### 40. POST /api/templates
Auth: yes.

**Body**
```json
{ "name": "Morning coffee", "categoryId": "6720b1b2c3d4e5f601234568", "amount": 35000, "note": "Coffee" }
```
`note` is optional (default `""`).

**201** – `data` is the new template.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Name is required"`, `"Name must be at most 40 characters"`, `"Category id is invalid"`, `"Amount must be greater than 0"`, `"Note must be at most 200 characters"` |
| 404 | `"Category not found"` (does not exist or belongs to another user) |

### 41. GET /api/templates/:id
Auth: yes. **200** – `data` is the template. **Errors**: 404 `"Template not found"` (also a malformed id or another user's template).

### 42. PATCH /api/templates/:id
Auth: yes. **Body**: at least one of `name`, `categoryId`, `amount`, `note`. **200** – `data` is the updated template.

**Errors**: 400 `"Nothing to update"` and the messages of endpoint 40; 404 `"Template not found"` / `"Category not found"`.

### 43. DELETE /api/templates/:id
Auth: yes. **200** – `{ "success": true, "data": { "_id": "..." } }`. **Errors**: 404 `"Template not found"`.

---

## Notifications

In-app notifications. They are created by the server when something happens, never by the client:

| Type | switch | Created when | `link` | `params` |
|------|--------|--------------|--------|----------|
| `budget_warning` | `budget` | An expense is created or edited and the budget of its category in that month reaches 80% | `/budgets?month=YYYY-MM` | `categoryName`, `month`, `percent`, `spent`, `amount` |
| `budget_over` | `budget` | The same, at 100% (a jump from below 80% past 100% creates only this one) | `/budgets?month=YYYY-MM` | same as above |
| `goal_completed` | `goals` | A deposit makes `savedAmount` reach `targetAmount` | `/goals` | `goalName`, `targetAmount` |
| `recurring_created` | `recurring` | A pass of the recurring rules created transactions (one notification for the whole pass) | `/transactions` | `count` |
| `weekly_summary` | `weekly` | `GET /api/notifications` finds no summary in the last 7 days and the user has at least one transaction | `/reports` | `total`, `count`, `topCategory`, `from`, `to` (last 7 days, Vietnam time) |

- Each event notifies **once**: the notification has a `dedupeKey` (unique per user, not sent to the client), for example
  `budget:<budgetId>:2026-10:80` or `weekly:2026-W44` (ISO week, Vietnam time). The database refuses a second one.
- A kind the user turned off in `PATCH /api/users/me/preferences` is not created at all (nothing is stored for it).
- Only VND expenses count towards a budget, like on the Budgets page. Income and other currencies never notify.
- There is no cron job. The weekly summary is created by the list route; `unread-count` is polled by the app every minute and creates nothing.
- Creating a notification never makes the request that caused it fail.
- `title` and `message` are English text for people reading the API. The app builds its own text, in the user's language,
  from `type` + `params`.

Notification object: `{ "_id", "type", "title", "message", "link", "params", "read", "createdAt", "updatedAt" }`.

### 46. GET /api/notifications
Auth: yes. Newest first.

**Query** (all optional)

| Param | Description |
|-------|-------------|
| `unread` | `true` = only unread ones. Default `false` |
| `page` | Whole number from 1. Default 1 |
| `limit` | 1-50. Default 20 |

**200** – `data` is an array (one page), `meta` is `{ page, limit, total, totalPages }`.
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f1b2c3d4e5f601234701",
      "type": "budget_warning",
      "title": "Budget warning: Food",
      "message": "Food has used 85% of its 2026-10 budget (850,000 VND of 1,000,000 VND).",
      "link": "/budgets?month=2026-10",
      "params": { "categoryName": "Food", "month": "2026-10", "percent": 85, "spent": 850000, "amount": 1000000 },
      "read": false,
      "createdAt": "2026-10-31T03:00:00.000Z",
      "updatedAt": "2026-10-31T03:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

**Errors**: 400 `"Page must be a whole number from 1"`, `"Limit must be a whole number from 1 to 50"`, `"Unread must be true or false"`.

### 47. GET /api/notifications/unread-count
Auth: yes. **200** – `{ "success": true, "data": { "count": 3 } }`.

### 48. PATCH /api/notifications/read-all
Auth: yes. No body. **200** – `{ "success": true, "data": { "updated": 3 } }` (how many were unread; 0 when none).

### 49. PATCH /api/notifications/:id/read
Auth: yes. No body. **200** – `data` is the notification, now read (also when it already was).
**Errors**: 404 `"Notification not found"` (also a malformed id or another user's notification).

### 50. DELETE /api/notifications/:id
Auth: yes. **200** – `{ "success": true, "data": { "_id": "..." } }`. **Errors**: 404 `"Notification not found"`.

---

## Users

### 51. PATCH /api/users/me/preferences
Auth: yes. Changes only the fields that are sent; the others keep their value. At least one field. An account made before
these fields existed counts as theme `system`, week on `monday`, no language and all notification switches on.

**Body** (any of them)
```json
{ "theme": "dark", "weekStartsOn": "sunday", "language": "vi", "notifications": { "budget": false } }
```
- `theme`: `light`, `dark` or `system` (follows the device). The app applies it at once and keeps a copy in localStorage.
- `weekStartsOn`: `monday` or `sunday`. The calendar in Reports starts its weeks on that day.
- `language`: one of `en`, `vi`, `fr`, `de`, `es`, `zh-CN`, `ja`, `ko`. Signing in on another device opens the app in it.
- `notifications`: switches `budget`, `goals`, `recurring`, `weekly` (booleans), at least one.

**200** – `data` is the user (same as `GET /api/auth/me`), for example
`"preferences": { "theme": "dark", "weekStartsOn": "sunday", "language": "vi", "notifications": { "budget": false, "goals": true, "recurring": true, "weekly": true } }`.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"`, `"Only notifications, theme, weekStartsOn, language can be changed"`, `"Theme must be one of light, dark, system"`, `"weekStartsOn must be one of monday, sunday"`, `"Language must be one of en, vi, fr, de, es, zh-CN, ja, ko"`, `"Notifications must be an object"`, `"Notifications can only have budget, goals, recurring, weekly"`, `"Notification setting \"budget\" must be true or false"` |

### 52. PATCH /api/users/me
Auth: yes. Changes the name. Any other field in the body (email, role...) is ignored.

**Body** `{ "name": "Minh Tri" }`

**200** – `data` is the user. **Errors**: 400 `"Name is required"` (`NAME_REQUIRED`), `"Name must be at most 50 characters"` (`NAME_TOO_LONG`).

### 53. PATCH /api/users/me/password
Auth: yes. Checks the current password, saves the new one (bcrypt) and raises the token version, so **every other device is
logged out**. The answer holds a new token for the device that asked; the client must store it.

**Body** `{ "currentPassword": "secret123", "newPassword": "a-better-secret" }`

**200** – `data` is `{ "token": "...", "user": { ... } }` (like login).

**Errors**

| Code | message |
|------|---------|
| 400 | `"Current password is required"` (`CURRENT_PASSWORD_REQUIRED`), `"New password must be at least 8 characters"` (`NEW_PASSWORD_TOO_SHORT`), `"Password must be at most 72 characters"` (`PASSWORD_TOO_LONG`), `"New password must be different from the current one"` (`PASSWORD_UNCHANGED`), `"Current password is incorrect"` (`WRONG_PASSWORD`) |

A wrong current password is a **400**, not a 401: the client logs the user out when it sees a 401.

### 54. POST /api/auth/logout-all
Auth: yes. No body. Raises the token version: every token made before, on every device, stops working. The device that
asked gets a new token and stays signed in (the app uses this for "Log out of all other devices").

**200** – `data` is `{ "token": "...", "user": { ... } }`.

### 55. GET /api/users/me/export
Auth: yes. No body. Everything the user owns, in one document. The app saves `data` as `ledgerling-data-YYYY-MM-DD.json`.
It never contains the password hash, the token version or any `userId`. Transactions, budgets, recurring rules and templates
show their category as `category: { _id, name, type }`.

**200**
```json
{
  "success": true,
  "data": {
    "exportedAt": "2026-10-31T03:00:00.000Z",
    "profile": { "_id": "...", "name": "Minh Tri", "email": "tri@example.com", "preferences": {} },
    "categories": [],
    "transactions": [],
    "budgets": [],
    "recurringRules": [],
    "goals": [],
    "templates": []
  }
}
```
The route is declared before any route with a parameter, so `export` is never read as an id.

### 56. DELETE /api/users/me
Auth: yes. Deletes the user and every category, transaction, budget, recurring rule, goal, template and notification that
belongs to the user. It cannot be undone.

**Body** `{ "password": "secret123" }`

**200** – `{ "success": true, "data": { "deleted": true } }`. The token is useless afterwards (the user is gone).

**Errors**: 400 `"Password is required"` (`PASSWORD_REQUIRED`), `"Password is incorrect"` (`WRONG_PASSWORD`).

---

## Admin

Every `/api/admin/*` route needs a token **and** `role: "admin"`: no token = **401**, a normal user = **403** `FORBIDDEN`
(`"You do not have permission to do this"`). The role is read from the database on every request, so a change applies at once.
An admin never sees the content of a user's transactions, only how many there are, and never a password hash.

The first admin is made by hand, because no route can change a role:
`cd server && npm run make-admin -- tri@example.com` (it uses the database in `server/.env`; the account must exist, and the person logs in again afterwards).

### 57. GET /api/admin/stats
Auth: admin. No body. Counts only. Days are Vietnam days (UTC+7): the last 30, today included, oldest first, and a day without anything is `0`.
"Active" = the user added at least one transaction in the last 7 days.

**200**
```json
{
  "success": true,
  "data": {
    "totalUsers": 42,
    "activeUsers7d": 17,
    "totalTransactions": 3150,
    "newUsersPerDay": [{ "date": "2026-10-02", "count": 0 }, "... 28 more ...", { "date": "2026-10-31", "count": 3 }],
    "transactionsPerDay": [{ "date": "2026-10-02", "count": 12 }, "... 28 more ...", { "date": "2026-10-31", "count": 54 }]
  }
}
```

### 58. GET /api/admin/users
Auth: admin. Newest accounts first.

| Query | Rule |
|-------|------|
| `q` | optional; part of the name or the email, case-insensitive, read as plain text (max 100 chars) |
| `page` | optional; whole number from 1, default 1 |
| `limit` | optional; whole number 1–50, default 10 |

**200** – `data` is an array and `meta` is `{ page, limit, total, totalPages }`.
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720a1b2c3d4e5f601234567",
      "name": "Minh Tri",
      "email": "tri@example.com",
      "role": "user",
      "status": "active",
      "createdAt": "2026-10-27T03:00:00.000Z",
      "transactionCount": 128
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```
**Errors**: 400 `"Page must be a whole number from 1"`, `"Limit must be a whole number from 1 to 50"`, `"Search must be at most 100 characters"`.

### 59. PATCH /api/admin/users/:id/status
Auth: admin. **Body** `{ "status": "disabled" }` or `{ "status": "active" }`. Any other field is ignored.

Disabling raises the user's `tokenVersion`, so every token the user already has stops working (**401**), and the user cannot log in
(**403** `"Account disabled"`) until an admin enables the account again. Pressing Disable on an account that is already disabled changes nothing.
Enabling does not give old tokens back: the user logs in again.

**200** – `data` is the user in the shape of endpoint 58 (with the new `status`).

**Errors**

| Code | message |
|------|---------|
| 400 | `"Status must be one of active, disabled"` (`STATUS_INVALID`) |
| 403 | `"You cannot disable your own account"` (`CANNOT_DISABLE_SELF`), `"You cannot disable another admin"` (`CANNOT_DISABLE_ADMIN`) |
| 404 | `"User not found"` (`USER_NOT_FOUND`; also for a malformed id) |
