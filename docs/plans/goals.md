# Plan: Savings goals (phase 14)

Branch: `feature/goals`.

Done when: adding and withdrawing money updates the progress correctly, a withdrawal can never be bigger than what
was saved, and a goal that reaches its target shows "Completed".

## Checklist
### Backend
- [x] `Goal` model (contributions are subdocuments)
- [x] `validateGoal.js` (goal body for create / update, contribution body, ids)
- [x] `goalService.js`: CRUD, `addContribution` and `removeContribution` with one atomic update each
- [x] `goalController.js`, `goalRoutes.js` + Swagger (`Goal`, `GoalInput`, `Contribution`, `ContributionInput` schemas)
- [x] `docs/api-plan.md`, `docs/erd.md`, Postman folder
- [x] API tests: `server/tests/goals.test.js` (CRUD, withdraw too much 400, parallel contributions, delete a
      contribution, 404 of another user, 401)

### Frontend
- [x] `api/goals.js`, `utils/goals.js` (days left, "save X per month") + unit tests, `target` icon, nav item + route
- [x] Goals page: card grid, add / edit dialog, Add money / Withdraw dialog, history dialog with delete, delete dialog,
      loading / empty / error states, toasts
- [x] Dashboard card "Savings goals": the 2 unfinished goals with the nearest deadline
- [x] Unit tests for the helpers, the card and the money dialog
- [x] Playwright: `client/e2e/goals.spec.js`

### Checks (there is no `lint` script yet)
- [x] `cd server && npm test` (257 passed)
- [x] `cd client && npm test` (120 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (30 passed: 15 tests x desktop and mobile)
- [x] Stop every server that was started

## Decisions
- `savedAmount` only changes through the contribution routes (never through `PUT /goals/:id`).
- Amounts are whole VND numbers (no decimals), so `$inc` can never drift: two parallel contributions always add up exactly.
- One contribution: `amount` > 0 adds money, `amount` < 0 withdraws. It is applied with a single
  `findOneAndUpdate({ _id, userId, savedAmount: { $gte: -amount } }, { $inc, $push })`. For a deposit the condition is
  always true; for a withdrawal it fails when the goal holds less than the amount, so the balance never goes below 0 and
  two parallel withdrawals cannot both succeed on the same money.
- Deleting a contribution is one atomic update too: it takes the amount back (`$inc: -amount`) and `$pull`s the entry
  only if the entry still exists with that amount. Deleting a deposit that was already spent by a later withdrawal is
  refused (400), because it would make `savedAmount` negative.
- The deadline must be after today only when a goal is created. On update it is not checked again, so a goal whose
  deadline has passed can still be renamed.
- A goal can be saved past its target; it is "Completed" as soon as `savedAmount >= targetAmount`, the progress stays at 100.
- The history dialog deletes an entry right away (no extra "Are you sure?"), because a deleted entry can be added again.
- `GET /goals` leaves out the contribution history (it is not needed for the cards). `GET /goals/:id` and the
  contribution routes return the goal with its history, newest first.
- Dates (`deadline`, contribution `date`) are days in Vietnam time (`YYYY-MM-DD`) stored at noon, like the recurring rules.
- "Save X per month": `ceil(remaining / max(1, ceil(daysLeft / 30)))`, calculated in the browser.
