# Plan: Budgets (phase 11)

Branch: `feature/budgets-e2e` (the first version of Budgets was built on `feature/budgets` and merged in PR #13;
this branch finishes the phase: dashboard card, missing tests, Playwright flow).

Done when: a monthly limit can be set for each expense category, and the progress bar and the warnings change
at exactly 80% and 100%.

## Audit of what already exists (merged)
- [x] `Budget` model, unique per user + category + month
- [x] `GET /api/budgets?month=` with spent / remaining / percent (1 decimal) / status, spent from one aggregation (VND, Vietnam time)
- [x] `POST /api/budgets`, `PATCH /api/budgets/:id` (amount only), `DELETE /api/budgets/:id`, `POST /api/budgets/copy`
- [x] Swagger docs, `docs/api-plan.md`, `docs/erd.md`, Postman requests
- [x] Deleting a category deletes its budgets
- [x] Budgets page: month picker, cards, add/edit dialog, delete confirm, "Copy from last month", toasts

## Gaps found
- Dashboard "Budget alerts" card is hidden when all budgets are fine or when there are no budgets. It needs a
  "Manage budgets" button, "All budgets on track" and an invitation to create a budget.
- API tests do not yet check spent / percent against hand-calculated numbers (several transactions, month edges,
  income and other users ignored), 400 for a bad `month` query, 401 on every route, 404 for another user's category.
- No Playwright test for the Budgets flow. No unit tests for the budget components.

## Checklist
### Backend
- [x] Audit service, validation, routes, Swagger (no API change needed)
- [x] Extra API tests in `server/tests/budgets.test.js`

### Frontend
- [x] `BudgetAlerts`: loading / error / no budgets / all on track / alerts, button "Manage budgets"
- [x] Unit tests: `BudgetCard`, `BudgetAlerts`
- [x] Playwright: `client/e2e/budgets.spec.js` (create budget, expense over 80% -> yellow bar -> Dashboard alert)

### Checks (there is no `lint` script yet)
- [x] `cd server && npm test` (92 passed)
- [x] `cd client && npm test` (31 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (8 passed: 4 tests x desktop and mobile)
- [x] Stop every server that was started

## Decisions
- The update route stays `PATCH` (like categories and transactions); the docs, Postman and client already use it.
- No new endpoint and no model change, so `docs/api-plan.md` and `docs/erd.md` stay as they are.
