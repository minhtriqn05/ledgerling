# Ledgerling – Transactions Page Plan (frontend)

Branch: `feature/transactions`. The API (endpoints 10–14 in `docs/api-plan.md`) is already built and in Postman.
Design: the "Transactions" tab of `/style-guide` (`pages/styleGuide/TransactionsPreview.jsx`) and `docs/ui-style.md`.

## Goal

A signed-in user can see the transactions of one month, filter them by category, add, edit and delete them.

Done when: the page lists the month's transactions, the month picker and category filter reload the list, the dialog
creates and edits, a delete needs a confirmation, and loading / empty / error states are shown.

## Decisions

- **No new libraries.** Plain React state, like `CategoriesPage`.
- **Filters:** month (`YYYY-MM`, Vietnam time, default = current month) and category (`all` or an id). Both are sent
  as query params. The type filter and search from the mock are left out (not asked for, no search endpoint).
- **No pagination:** the API returns the whole month, so the mock's pager is left out.
- **Summary cards** (income / expense / net) are computed from the loaded list, so no extra request.
- **Money and dates:** `formatSignedVnd` and `formatDateDMY` from `utils/format.js`. Currency is never sent, the
  server defaults to `VND`.
- **Date field:** `<input type="date">` holds a Vietnam calendar day. It is sent as `YYYY-MM-DDT12:00:00+07:00`
  (noon, so the day never shifts); when editing it is sent only if the user changed it.
- **Dialog:** a new shared `Modal` built on the native `<dialog>` element (`showModal()` gives the focus trap, the
  Escape key and the dimmed page for free). Used by the add / edit form and by the delete confirmation.
- **Delete:** a small confirmation dialog (Cancel is focused, Delete is the danger button). On phones the rows are
  tapped to edit, so the edit dialog also has a Delete button.
- **After saving:** the page jumps to the saved transaction's month (and clears a category filter that would hide it),
  then reloads the list.

## Files

- new `client/src/api/transactions.js` – `getTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`
- new `client/src/utils/vnDate.js` – current month, month shift / label, date input helpers (Vietnam time)
- `client/src/components/Icon.jsx` – add `x`, `chevronLeft`, `chevronRight`, `arrowUpRight`, `arrowDownLeft`, `wallet`
- new `client/src/components/Modal/` and `client/src/components/MonthPicker/`
- `client/src/pages/TransactionsPage.jsx` (+ css) and `client/src/pages/transactions/`:
  `TransactionList` (table + phone list), `TransactionFormDialog`, `DeleteTransactionDialog`
- `docs/ui-style.md` – small note about the new Modal and MonthPicker components

## Test

Postman is not needed (the API was tested before). In the browser, with `npm run dev` in both folders: add, edit,
delete, change month, filter by category, stop the server to see the error state, narrow the window to 390px.
