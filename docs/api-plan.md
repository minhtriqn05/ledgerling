# Ledgerling – API Plan

Base URL: `http://localhost:4000/api` (local), `https://<render-app>.onrender.com/api` (production).
Swagger UI: `/api-docs` (outside `/api`).

## Conventions

- **Auth**: protected routes need the header `Authorization: Bearer <token>`.
  The token comes from `POST /auth/register` or `POST /auth/login`.
- **Success**: `{ "success": true, "data": ... }`
- **Error**: `{ "success": false, "message": "..." }`
- **Ownership**: the user always comes from the token, never from the body. An item that belongs
  to another user is answered with 404, as if it did not exist.
- **Month filter**: `month=YYYY-MM` covers Vietnam time (UTC+7), from the 1st at 00:00 +07:00
  to the 1st of the next month at 00:00 +07:00.
  Example `2026-10` → `2026-09-30T17:00:00.000Z` ≤ date < `2026-10-31T17:00:00.000Z`.
- **Dates** are ISO 8601 strings; the server stores them in UTC.
- **Updates** use PATCH: send only the fields you want to change (at least one).

### Status codes

| Code | When |
|------|------|
| 200 | OK (read, update, delete) |
| 201 | Created |
| 400 | Invalid input (validation failed, unknown field value, bad format, body that is not valid JSON → `"Invalid JSON body"`) |
| 401 | Missing/invalid/expired token, wrong email or password |
| 404 | Not found, belongs to another user, malformed `:id` in the URL, or unknown route (`"Route not found"`) |
| 409 | Duplicate (email, category name, budget of the same category and month) or conflict (category still has transactions) |
| 500 | Server error |

### Validation rules

| Field | Rule |
|-------|------|
| `name` (user) | string, trimmed, 1–50 chars |
| `email` | valid email, stored lowercase, unique |
| `password` | string, 6–72 chars (72 = bcrypt limit) |
| `name` (category) | string, trimmed, 1–30 chars, unique per user + type (case-insensitive) |
| `type` | `"income"` or `"expense"` |
| `color` | hex `#RRGGBB` |
| `categoryId` | valid ObjectId of one of the user's categories |
| `amount` | JSON number > 0 (a string like `"45000"` is refused) |
| `currency` (transaction body) | 3 letters (ISO 4217); lower case is converted to upper case; default `"VND"` |
| `currency` (stats query) | 3 **uppercase** letters; lower case like `usd` is refused with 400; default `"VND"` |
| `note` | string, trimmed, max 200 chars, optional, default `""` |
| `date` | ISO 8601 date, default: now |
| `month` (query) | `YYYY-MM` |
| `month` (budget body) | `YYYY-MM`, required; cannot be changed after the budget is created |
| `categoryId` (budget body) | valid ObjectId of one of the user's **expense** categories |
| `amount` (budget body) | JSON number > 0, the limit in VND |

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
| 9 | DELETE | `/api/categories/:id` | Yes | Delete (409 if it has transactions) |
| 10 | GET | `/api/transactions` | Yes | List my transactions, paginated (`?month=&from=&to=&type=&categoryId=&q=&sort=&page=&limit=`) |
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
    "createdAt": "2026-10-27T03:00:00.000Z",
    "updatedAt": "2026-10-27T03:00:00.000Z"
  }
}
```

**Errors**: 401 also if the user in the token no longer exists.

Logout: no endpoint. The client deletes the token from localStorage.

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
{ "success": true, "data": [ { "_id": "...", "name": "Food", "type": "expense", "color": "#FF7043", "createdAt": "...", "updatedAt": "..." } ] }
```

**Errors**: 400 `"Type must be income or expense"`.

### 6. POST /api/categories
Auth: yes.

**Body**
```json
{ "name": "Food", "type": "expense", "color": "#FF7043" }
```

**201** – `data` is the new category object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Name is required"`, `"Name must be at most 30 characters"`, `"Type must be income or expense"`, `"Color must be a hex code like #FF7043"` |
| 409 | `"Category already exists"` (same name + type for this user, case-insensitive) |

### 7. GET /api/categories/:id
Auth: yes.

**200** – `data` is the category object.

**Errors**: 404 `"Category not found"`.

### 8. PATCH /api/categories/:id
Auth: yes.

**Body** (at least one field)
```json
{ "name": "Eating out", "color": "#E53935" }
```
`type` cannot be changed (it is copied into every transaction of this category).

**200** – `data` is the updated category object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"`, `"Type cannot be changed"` (any `type` in the body, even the same value), `"Name is required"`, `"Name must be at most 30 characters"`, `"Color must be a hex code like #FF7043"` |
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

When the delete succeeds, the budgets of the category (every month) are deleted with it.

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
  "date": "2026-10-27T12:30:00+07:00"
}
```
Required: `categoryId`, `amount`. `type` is not sent: the server copies it from the category.

**201** – `data` is the new transaction object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Category id is invalid"`, `"Amount must be greater than 0"`, `"Currency must be a 3-letter ISO code"`, `"Note must be a string"`, `"Note must be at most 200 characters"`, `"Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00"` |
| 404 | `"Category not found"` |

### 12. GET /api/transactions/:id
Auth: yes.

**200** – `data` is the transaction object.

**Errors**: 404 `"Transaction not found"`.

### 13. PATCH /api/transactions/:id
Auth: yes.

**Body** (at least one of `categoryId`, `amount`, `currency`, `note`, `date`)
```json
{ "amount": 50000, "note": "Lunch with friends" }
```
If `categoryId` changes, `type` is copied again from the new category.

**200** – `data` is the updated transaction object.

**Errors**

| Code | message |
|------|---------|
| 400 | `"Nothing to update"` + same validation messages as create |
| 404 | `"Transaction not found"`, `"Category not found"` |

### 14. DELETE /api/transactions/:id
Auth: yes.

**200**
```json
{ "success": true, "data": { "_id": "6720c1b2c3d4e5f601234569" } }
```

**Errors**: 404 `"Transaction not found"`.

### 21. GET /api/transactions/export
Auth: yes. Declared **before** `/api/transactions/:id`, so `export` is never read as an id.

**Query**: the same filters as endpoint 10 (`month`, `from`, `to`, `type`, `categoryId`, `q`, `sort`), with the same rules.
`page` and `limit` are ignored (even if invalid). At most **5000 rows**; if more match, only the first 5000 of the chosen sort are in the file.

**200** – a file, not JSON
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="ledgerling-2026-10.csv"` – `ledgerling-YYYY-MM.csv` for a month (default: current month),
  `ledgerling-FROM_TO.csv` for a date range (`start` / `end` when one side is missing)
- Columns: `Date` (Vietnam time, `YYYY-MM-DD HH:mm`), `Type`, `Category`, `Amount`, `Currency`, `Note`
- Starts with a UTF-8 BOM; lines end with CRLF
- A cell with a comma, a double quote or a line break is wrapped in `"` (each `"` inside is doubled)
- A cell that starts with `=`, `+`, `-`, `@` (or a tab / carriage return) gets a `'` in front, so a spreadsheet does not run it as a formula (CSV injection)

```
Date,Type,Category,Amount,Currency,Note
2026-10-27 12:30,expense,Food,45000,VND,Lunch
2026-10-27 18:30,expense,Food,85000,VND,"Dinner, with team"
```

**Errors** (400): the same as endpoint 10 for the filters (nothing for `page` / `limit`). The error body is JSON as usual.

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
