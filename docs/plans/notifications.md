# Plan: In-app notifications (phase 17)

Branch: `feature/notifications`.

Done when: the bell shows the right unread number, every threshold notifies only once, and a type the user turned off
is never created.

## Checklist
### Backend
- [x] `Notification` model (unique index `userId + dedupeKey`), `User.preferences.notifications`
- [x] `utils/month.js`: `isoWeekKey()` for the weekly dedupe key
- [x] `notificationService.js`: `notify()` (respects preferences, skips a duplicate `dedupeKey`), list / unread-count /
      mark read / read-all / delete, `notifyBudgetThresholds`, `notifyGoalCompleted`, `notifyRecurringCreated`,
      `ensureWeeklySummary`
- [x] Hooks: `createTransaction` / `updateTransaction` (budget), `addContribution` (goal), `processDueRules` (recurring),
      `GET /notifications` (weekly)
- [x] `PATCH /users/me/preferences` (`userService`, `userController`, `validateUser`, `userRoutes`)
- [x] `notificationController`, `validateNotification`, `notificationRoutes` + Swagger (`Notification` schema, `User.preferences`)
- [x] `docs/api-plan.md`, `docs/erd.md`
- [x] API tests: `server/tests/notifications.test.js`

### Frontend
- [x] `api/notifications.js`, `utils/notifications.js` (icon per type, "2h ago", text per type) + unit tests
- [x] Bell in the top bar: unread badge, poll every 60 s while the tab is visible, refresh after every add / edit
- [x] Dropdown: list, icon per type, relative time, click = go to the link + mark read, Mark all as read, empty state
- [x] Page `/notifications` (pagination, unread filter) + `navItems`
- [x] Notification settings (one switch per type) on the notifications page
- [x] Locale keys in en.json and all 7 other locales (UI texts + new API error codes)
- [x] Playwright: `client/e2e/notifications.spec.js`

### Checks
- [x] `cd server && npm test` (422 passed)
- [x] `cd client && npm test` (410 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (80 passed: 40 tests x desktop and mobile)
- [x] `cd client && npm run i18n:check`
- [x] Stop every server that was started

## Decisions
- The Live URLs in CLAUDE.md are still placeholders, so the live-site check (step 2) was skipped.
- The notification stores `type`, `title`, `message`, `link` in English (as the data model says) and also `params`
  (the numbers and names it was built from). The client builds the text in the user's language from `type` + `params`
  and only falls back to `title` / `message`.
- Budget thresholds: one notification per budget and level, `dedupeKey = budget:<budgetId>:<month>:<80|100>`.
  A jump from below 80% straight past 100% creates only `budget_over`.
- Only VND expenses count (same as the budgets page). Checked after a transaction is created or edited.
- Goal: `goal_completed` is created by the contribution that crosses the target (`dedupeKey` has the contribution id),
  so more deposits afterwards do not notify again.
- Recurring: one `recurring_created` per `processDueRules` pass that created at least one transaction
  (`dedupeKey = recurring:<first created transaction id>`).
- Weekly: created only by `GET /notifications` (not by `unread-count`, which is polled), when there is no
  `weekly_summary` in the last 7 days, and the user has at least one transaction. `dedupeKey = weekly:<ISO week>`
  (Vietnam time).
- A failing notification never makes the original request fail (best effort, the error is logged).
