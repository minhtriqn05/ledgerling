# Plan: Reports, calendar and insights (phase 15)

Branch: `feature/reports`.

Done when: the report numbers match the numbers worked out by hand, an empty month does not break anything, every
insight rule fires on its condition, and a click on a day of the calendar opens the matching transactions.

## Checklist
### Backend
- [x] `utils/month.js`: helpers for the days of a month (`daysInMonth`, `monthDays`) and "days elapsed" in Vietnam time
- [x] `validateReports.js`: `month` and `year` query checks
- [x] `reportService.js`: `getMonthlyReport`, `getYearlyReport` (MongoDB aggregation, Vietnam time)
- [x] `insightService.js`: rule-based insights built from the monthly report + budgets
- [x] `reportController.js`, `reportRoutes.js`, `insightRoutes.js` + Swagger; `processDueRules` before every calculation
- [x] `docs/api-plan.md` (no model change, so no `docs/erd.md` change), Postman folder
- [x] API tests: `server/tests/reports.test.js`, `server/tests/insights.test.js`

### Frontend
- [x] `api/reports.js`, `utils/reports.js` (change %, arrows, calendar grid, intensity) + unit tests, `reports` icon, nav item + route
- [x] Reports page with 3 tabs (the tab is kept in the URL: `?tab=monthly|yearly|calendar&month=...&year=...`)
- [x] Monthly tab: 3 cards, daily line chart, top categories table, top tags, extra numbers, Insights card
- [x] Yearly tab: 12-month bar chart + year totals
- [x] Calendar tab: CSS grid, Monday first, darker = more spending, click a day -> `/transactions?from=&to=`
- [x] Dashboard card "Insights"
- [x] Print button + `@media print` (sidebar, tabs, pickers hidden; cards never split)
- [x] Unit tests for helpers and components
- [x] Playwright: `client/e2e/reports.spec.js`

### Checks
- [x] `cd server && npm test` (313 passed)
- [x] `cd client && npm test` (165 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (36 passed: 18 tests x desktop and mobile)
- [x] Stop every server that was started

## Decisions
- Reports and insights only count transactions in one currency (VND by default, like `/stats/summary`), so 10 USD is
  never added as 10 VND. A `currency` query is accepted the same way as in stats.
- Every day is a day in Vietnam time (`$dateToString` with timezone `+07:00`), so a 23:30 expense on the last day of a
  month stays in that month and on that day.
- `changePercent` = `(current - previous) / previous * 100`, rounded to 1 decimal; `null` when the previous value is 0.
- `dailyExpense` always has one entry per day of the month (days without spending are 0). `averagePerDay` divides by the
  days that have already passed: the whole month for a past month, today's day number for the current month, 0 days
  (so 0) for a future month.
- `noSpendDays` counts days that have started (same rule as above) without any expense. A future day is not a no-spend day.
- Insight rules (max 6, most important first, at least 3 are returned when the data allows it):
  1. category spending up or down by 20% or more vs. last month (only when last month was above 0),
  2. budget forecast: spent / days elapsed * days in month > budget (current month only),
  3. no-spend days, 4. savings rate, 5. largest expense.
- Category `icon` is returned when the category has one (the Category model has no `icon` yet, so it is `null` for now).
