# Plan: Recurring transactions (phase 13)

Branch: `feature/recurring`.

Done when: a due rule creates all its transactions by itself, many parallel calls never create a duplicate, and
day 31 is handled correctly (a shorter month runs on its last day).

## Checklist
### Backend
- [x] `RecurringRule` model; `recurringRuleId` + partial unique index on `Transaction`
- [x] Date helpers (`utils/month.js`) and schedule helper (`utils/recurrence.js`)
- [x] `validateRecurring.js`, `recurringService.js` (CRUD, toggle, `processDueRules`), controller, routes + Swagger
- [x] `processDueRules` at the start of `GET /transactions`, `GET /stats/summary`, `GET /budgets` (and `GET /recurring`)
- [x] Deleting a category that still has a rule is blocked (409)
- [x] `docs/api-plan.md`, `docs/erd.md`, Postman folder
- [x] API tests: `server/tests/recurring.test.js`, unit tests: `server/tests/recurrence.test.js`

### Frontend
- [x] `api/recurring.js`, `repeat` icon, nav item + route
- [x] Recurring page: list, active switch, add / edit dialog, delete dialog, loading / empty / error, toasts
- [x] "Recurring" label in the transaction list (table and phone list)
- [x] Unit tests for the rule row, the form dialog and the label
- [x] Playwright: `client/e2e/recurring.spec.js`

### Checks (there is no `lint` script yet)
- [x] `cd server && npm test` (188 passed)
- [x] `cd client && npm test` (89 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (22 passed: 11 tests x desktop and mobile)
- [x] Stop every server that was started

## Decisions
- `startDate` and `endDate` are days (`YYYY-MM-DD`, Vietnam time). Every date of a rule is stored at noon Vietnam time,
  like the dates from the Transactions form, so one day is always exactly one `Date`. The unique index relies on this.
- A monthly rule always counts from the day of `startDate`: 31 Jan → 28 Feb → 31 Mar (it does not stay on 28).
- `endDate` is the last day that can run (inclusive). A rule past its end keeps `active` as it is and the API returns
  `ended: true`. Moving `endDate` later makes it run again.
- `PUT` replaces the whole rule (a missing `note` becomes empty, a missing `endDate` removes it).
- Changing `frequency` or `startDate` sets `nextRunDate` to the first date of the new schedule after the last
  transaction the rule created. Without this, changing monthly to weekly would create every past week again.
- Turning a rule back on skips the dates that passed while it was off, so pausing does not create a pile of transactions.
- `GET /recurring` also runs `processDueRules`, otherwise the page would show a "next run" date in the past.
