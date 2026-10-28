# Ledgerling – Dashboard Plan

Branch: `feature/dashboard`. API contract: `docs/api-plan.md` §Stats (endpoint 15). Design: the "Dashboard" tab of
`/style-guide` (`pages/styleGuide/DashboardPreview.jsx`) and `docs/ui-style.md` §7, §9.

## Goal

The dashboard shows, for one month, the income / expense / balance cards, spending by category (donut) and the cash
flow of the last 6 months. One endpoint computes all of it in MongoDB, so the client never downloads every
transaction.

Done (backend) when: `GET /api/stats/summary` returns the signed-in user's numbers in Swagger and Postman, months
follow Vietnam time, and another user's data never shows up.

## Decisions

- **Replaces `GET /api/reports/monthly`** (the old endpoint 15 in `api-plan.md`): the path `/api/stats/summary` was
  asked for, and the response now also has the last 6 months.
- **6-month data = income + expense per month** (`byMonth`), so it fits the approved Cash flow chart; a bar chart can
  use only `expense`. Always 6 entries, oldest first, ending with the chosen month; a month without transactions is 0.
- **`?currency=`, default `VND`:** only transactions in that currency are summed, so 10 USD is never added as 10 ₫.
- **Vietnam time:** the month uses `monthRange()`; the chart groups with `$dateToString` and `timezone: "+07:00"`
  (`VIETNAM_TIMEZONE` in `utils/month.js`).
- **3 small aggregation pipelines in `Promise.all`** instead of one `$facet`: totals by type, expense per category
  (`$lookup` into `categories` for the name and color), income / expense per month. Each can be pasted into Compass.
- **`aggregate()` does not cast types** like `find()` does: the user id from the token becomes
  `new mongoose.Types.ObjectId(userId)`, otherwise `$match` finds nothing.
- **No new library, no new index** (`{ userId: 1, date: -1 }` already covers the `$match`).

## Steps

**B1 – Endpoint + Swagger**
- `server/src/utils/month.js` + `VIETNAM_TIMEZONE` and `shiftMonth(month, delta)` (same as the client's `vnDate.js`)
- new `server/src/middlewares/validateStats.js`, `server/src/services/statsService.js`,
  `server/src/controllers/statsController.js`, `server/src/routes/statsRoutes.js` (Swagger tag `Stats`)
- `server/src/routes/index.js` → `router.use("/stats", statsRoutes)`
- Commit: `feat: add stats summary endpoint with MongoDB aggregation`

**B2 – Docs + Postman**
- `docs/api-plan.md` §Stats; `docs/postman/ledgerling.postman_collection.json` – Stats folder; this file.
- Test: run the Stats folder after Auth and Categories. It uses March 2020: Mar 1st 00:30 Vietnam time (Feb 29 in
  UTC) counts in March, Apr 1st 00:30 (Mar 31 in UTC) in April, and the USD expense only with `?currency=USD`.
  `byMonth` goes back to October 2019. The other user sees 0; no token → 401; `2020-13` and `usd` → 400. The Cleanup
  requests remove everything again.
- Commit: `docs: add stats summary to API plan and Postman`

## Frontend (next)

Planned once the backend is committed, from the approved mock. The cards, Cash flow and Spending by category read
`GET /api/stats/summary`; the "vs last month" change can be computed from the last two entries of `byMonth`.
Not covered by this endpoint yet: "This week" (spending per day) and "Recent transactions".
