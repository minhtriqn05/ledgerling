# API guide

| | |
|---|---|
| Base URL (production) | [https://ledgerling-api.onrender.com/api](https://ledgerling-api.onrender.com/api) (a public front page with links; the bare server address opens Swagger UI) |
| Base URL (local) | `http://localhost:4000/api` |
| Interactive docs | [Swagger UI](https://ledgerling-api.onrender.com/api-docs) (`/api-docs`, outside `/api`) |
| Full reference | [api-plan.md](api-plan.md): every endpoint with its query, body, answers and errors |
| Postman | [postman/ledgerling.postman_collection.json](postman/ledgerling.postman_collection.json) |

The 72 endpoints are listed in the [README](../README.md#api-overview). This page explains the rules they all share.

## Conventions

- REST with plural nouns: `/transactions`, `/transactions/:id`, `/budgets/copy`.
- JSON in and out. Updates use `PATCH` with only the fields that change; `PUT /recurring/:id` and `PUT /goals/:id`
  replace the whole item.
- **Success**: `{ "success": true, "data": ... }` with 200, or 201 for a new item.
- **Error**: `{ "success": false, "message": "...", "code": "..." }`. `message` is English for people; `code` is stable
  and the app translates it.
- **Dates** are ISO 8601 and stored in UTC. A `month=YYYY-MM` filter covers Vietnam time (UTC+7): `2026-10` means
  `2026-09-30T17:00:00.000Z` ≤ date < `2026-10-31T17:00:00.000Z`.
- **Money** is a JSON number of whole VND from 1 to 999,999,999,999. A string, a decimal or 13 digits is refused with
  `AMOUNT_INVALID`.
- **Ownership**: the user always comes from the token, never from the body. Another user's item answers 404, exactly like
  an item that does not exist.

## Authentication

1. `POST /auth/register` (`name`, `email`, `password`) or `POST /auth/login` (`email`, `password`) answers
   `{ token, user }`. `POST /auth/demo` signs in to the shared demo account without a password.
2. Send the token on every protected route: `Authorization: Bearer <token>`.
3. The token is a JWT with the user id, an expiry (`JWT_EXPIRES_IN`, 7 days by default) and the user's `tokenVersion`.
   On every request the server reads the user again: a new password, **log out of all devices**, a disabled or a deleted
   account make every older token answer 401 `TOKEN_INVALID`.
4. Admin routes (`/admin/*`) also need the `admin` role (else 403 `FORBIDDEN`). The demo account cannot change its
   password or avatar, log out everywhere or delete itself (403 `DEMO_READ_ONLY`).

In Swagger UI, click **Authorize**, paste the token (without `Bearer`), and every "Try it out" sends it.

## Status codes

| Code | When |
|------|------|
| 200 / 201 | OK / created |
| 400 | invalid input, invalid JSON, unknown value, MongoDB operator in the input |
| 401 | missing, invalid or expired token; wrong email or password |
| 403 | not allowed: not an admin, disabled account, demo restrictions |
| 404 | not found, belongs to another user, malformed id, unknown route |
| 409 | duplicate or conflict (email taken, category in use, budget exists, wallet has history ...) |
| 413 | body too large |
| 429 | too many requests |
| 503 | demo account not seeded yet |
| 500 | server error (no stack trace in the answer) |

## Error codes

Each error has a `code` that never changes meaning. When no specific code fits, the status gives a default: 400
`VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 500 `INTERNAL_ERROR`.
Some common ones:

| Code | Status | Meaning |
|------|--------|---------|
| `EMAIL_TAKEN` | 409 | an account with this email exists |
| `INVALID_CREDENTIALS` | 401 | wrong email or password |
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | no token / bad, expired or revoked token |
| `AMOUNT_INVALID` | 400 | not a whole VND amount in range |
| `DATE_INVALID` | 400 | not a real day of 1970–2100 |
| `CATEGORY_IN_USE` | 409 | the category still has transactions |
| `BUDGET_EXISTS` | 409 | that category already has a budget for that month |
| `WALLET_IN_USE` | 409 | the wallet has transactions or transfers; archive it instead |
| `INVALID_INPUT` | 400 | a `$` or dotted key in the body, or `$` / `[` in a query key |
| `RATE_LIMITED` | 429 | too many requests from this visitor |
| `DEMO_UNAVAILABLE` | 503 | the demo account has not been seeded |

The complete table (76 codes, grouped by status) is in
[api-plan.md → Error codes](api-plan.md#error-codes). A server test checks that the table, the code and the client
translations list the same codes.

## Pagination

Paginated lists (`GET /transactions`, `GET /transfers`, `GET /notifications`, `GET /admin/users`) keep `data` as an array
and add `meta`:

```json
{
  "success": true,
  "data": [ { "_id": "...", "amount": 45000, "note": "Lunch" } ],
  "meta": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 }
}
```

- `page` is a whole number from 1 to 100,000 (default 1); `limit` from 1 to 100 (default 20).
- `totalPages` is `Math.ceil(total / limit)`, 0 when nothing matches; a page after the last one answers `data: []`.
- Sorting has a fixed tie-breaker, so two pages never show the same item.

## Limits

| What | Limit |
|------|-------|
| All of `/api` (except `/api/health`) | 300 requests per 15 minutes per visitor |
| `POST /auth/login`, `/auth/register`, `/auth/demo` | 20 requests per 15 minutes per visitor, each its own counter |
| JSON body | 100 kB; 300 kB for `POST /transactions/import`; 200 kB for `PATCH /users/me/avatar` |
| CSV import | 500 rows |
| Bulk actions | 1–200 ids |

The answers carry the `RateLimit-*` headers. On Render the visitor is the `CF-Connecting-IP` address that Cloudflare
writes (a visitor cannot send it), else the address found with `trust proxy`. The counters live in memory and start
again when the server restarts.

## Real-time events

Socket.IO runs on the same host and port (`/socket.io`). Connect with `io(url, { auth: { token } })`; the server sends
`data:changed { resource }` after a write and `notification:new { id, type }` for a new notification, only to the
sockets of the same user. Details: [api-plan.md → Real-time events](api-plan.md#real-time-events-socketio).

## Examples with curl

The examples use the production API; replace the base URL with `http://localhost:4000/api` for a local server. On the
free plan the first request can take up to a minute while the server wakes up.

```bash
API=https://ledgerling-api.onrender.com/api

# The front page of the API, then the health check (never rate-limited)
curl -s $API
curl -s $API/health

# Sign in to the demo account and keep the token
TOKEN=$(curl -s -X POST $API/auth/demo | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

# Who am I?
curl -s $API/auth/me -H "Authorization: Bearer $TOKEN"

# The expense categories
curl -s "$API/categories?type=expense" -H "Authorization: Bearer $TOKEN"

# The second page of this month's expenses, biggest first
curl -s "$API/transactions?type=expense&sort=-amount&page=2&limit=10" -H "Authorization: Bearer $TOKEN"

# Add an expense (use a categoryId from the list above)
curl -s -X POST $API/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"categoryId":"<id>","amount":35000,"note":"Coffee","tags":["work"]}'

# The Dashboard numbers of a month
curl -s "$API/stats/summary?month=2026-11" -H "Authorization: Bearer $TOKEN"

# An error: an amount with decimals
curl -s -X POST $API/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"categoryId":"<id>","amount":1000.5}'
# {"success":false,"message":"...","code":"AMOUNT_INVALID"}
```

The demo account is shared: please delete what you add. To register your own account:

```bash
curl -s -X POST $API/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"secret123"}'
```
