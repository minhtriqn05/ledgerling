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
| 400 | Invalid input (validation failed, unknown field value, bad format) |
| 401 | Missing/invalid/expired token, wrong email or password |
| 404 | Not found, or belongs to another user |
| 409 | Duplicate (email, category name) or conflict (category still has transactions) |
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
| `amount` | number > 0 |
| `currency` | 3 uppercase letters (ISO 4217), default `"VND"` |
| `note` | string, max 200 chars, optional, default `""` |
| `date` | ISO 8601 date, default: now |
| `month` (query) | `YYYY-MM` |

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
| 10 | GET | `/api/transactions` | Yes | List my transactions (`?month=&type=&categoryId=`) |
| 11 | POST | `/api/transactions` | Yes | Create a transaction |
| 12 | GET | `/api/transactions/:id` | Yes | Get one transaction |
| 13 | PATCH | `/api/transactions/:id` | Yes | Update a transaction |
| 14 | DELETE | `/api/transactions/:id` | Yes | Delete a transaction |
| 15 | GET | `/api/reports/monthly` | Yes | Totals + per-category totals for a month |

Every protected route (Auth = Yes) can also return **401** (`"Not authorized, token missing"` /
`"Not authorized, invalid token"`) and every route can return **500** (`"Internal server error"`).
These are not repeated below.

---

## Health

### 1. GET /api/health
Auth: no.

**200**
```json
{ "success": true, "data": { "status": "ok" } }
```

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
| 400 | `"Name is required"`, `"Email is invalid"`, `"Password must be at least 6 characters"` |
| 409 | `"Email is already registered"` |

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
| 400 | `"Name is required"`, `"Type must be income or expense"`, `"Color must be a hex code like #FF7043"` |
| 409 | `"Category already exists"` (same name + type for this user) |

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
| 400 | `"Nothing to update"`, `"Type cannot be changed"`, `"Color must be a hex code like #FF7043"` |
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
| `month` | `2026-10` | default: current month in Vietnam time |
| `type` | `expense` | `income` \| `expense` |
| `categoryId` | `6720b1b2...` | |

Sorted by `date` descending, then `createdAt` descending.

**200**
```json
{ "success": true, "data": [ { "_id": "...", "category": { "_id": "...", "name": "Food", "color": "#FF7043" }, "type": "expense", "amount": 45000, "currency": "VND", "note": "Lunch", "date": "...", "createdAt": "...", "updatedAt": "..." } ] }
```

**Errors**: 400 `"Month must be in YYYY-MM format"`, `"Type must be income or expense"`, `"Category id is invalid"`.

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
| 400 | `"Category id is invalid"`, `"Amount must be greater than 0"`, `"Currency must be a 3-letter ISO code"`, `"Note must be at most 200 characters"`, `"Date is invalid"` |
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

---

## Reports

### 15. GET /api/reports/monthly
Auth: yes. Data for the dashboard charts (Recharts).

**Query**

| Param | Default | Note |
|-------|---------|------|
| `month` | current month (Vietnam time) | `YYYY-MM` |
| `currency` | `VND` | only transactions in this currency are summed |

**200**
```json
{
  "success": true,
  "data": {
    "month": "2026-10",
    "currency": "VND",
    "totalIncome": 15000000,
    "totalExpense": 4250000,
    "balance": 10750000,
    "byCategory": [
      { "categoryId": "6720b1b2c3d4e5f60123456a", "name": "Salary", "type": "income", "color": "#43A047", "total": 15000000 },
      { "categoryId": "6720b1b2c3d4e5f601234568", "name": "Food", "type": "expense", "color": "#FF7043", "total": 2100000 }
    ]
  }
}
```
`byCategory` is sorted by `total` descending; categories with no transactions in the month are left out.

**Errors**: 400 `"Month must be in YYYY-MM format"`, `"Currency must be a 3-letter ISO code"`.
