# Plan: Quick entry and experience (phase 16)

Branch: `feature/quick-ux`.

Done when: adding by the "+" button or the N key works (typing "coffee 35k #work" is understood correctly), transaction
templates, category icons, bulk actions and Undo all work.

Live site check (step 2): the Live URLs in CLAUDE.md are still placeholders (`[link Vercel]`, `[link Render]`), so there
was nothing to curl. Reported in the final answer.

## Checklist
### Backend
- [x] `Category.icon` (optional single emoji, default `null`) + validation (create / update, `null` or `""` clears it)
- [x] Default categories get icons; `icon` is returned wherever a category is embedded (transactions, budgets,
      recurring rules, stats per category)
- [x] `TransactionTemplate` model, `validateTemplate.js`, `templateService.js`, controller, routes `/api/templates` + Swagger
- [x] Deleting a category also deletes its templates
- [x] `POST /api/transactions/bulk-delete`, `PATCH /api/transactions/bulk-category` (max 200 ids, own data only)
- [x] Swagger: `Category.icon`, `Template`, `TemplateInput`, new tag `Templates`
- [x] `docs/api-plan.md`, `docs/erd.md`, Postman collection
- [x] API tests: `templates.test.js`, `transactionBulk.test.js`, `categoryIcons.test.js` (icon cases)

### Frontend
- [x] `utils/emoji.js` (about 40 emoji), `EmojiPicker`, icon in `CategoryForm`; `CategoryMark` shows the icon (or the colour dot)
      in the category table, cards, chart legends, budgets, recurring rules, reports and the category chips / selects
- [x] `utils/quickAdd.js` (`parseQuickAdd`) + unit tests
- [x] `api/templates.js`; bulk functions in `api/transactions.js`
- [x] Toast with an action button and its own duration
- [x] `QuickAddContext` + `QuickAddDialog` (smart text box, amount, category chips, date, note, tags, template chips),
      floating "+" button; the open page reloads after a save (the `<Outlet>` gets a new `key`)
- [x] "Save as template" in the transaction dialog
- [x] Bulk actions on the Transactions page: row / page checkboxes, bulk bar, Delete selected (confirm), Change category
- [x] Undo delete (`hooks/useUndoDelete.js`): row hidden at once, API call after 5 s, flushed when the page is left
- [x] Keyboard shortcuts (`hooks/useHotkeys.js`): N, /, ? + shortcuts dialog
- [x] Skeletons instead of "Loading…" for tables and cards
- [x] Unit tests: parser, hotkey filter, undo hook, emoji picker, bulk bar / list selection
- [x] Playwright `client/e2e/quick-ux.spec.js`

### Checks (there is no `lint` script yet)
- [x] `cd server && npm test` (377 passed)
- [x] `cd client && npm test` (309 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (56 passed: 28 tests x desktop and mobile)
- [x] Stop every server that was started

## Decisions
- `icon` is validated as exactly one emoji: one grapheme (`Intl.Segmenter`) that contains an `Extended_Pictographic`
  character. Old categories simply have `icon: null`; nothing on Atlas is changed.
- A template stores `name, categoryId, amount, note` (no tags, no type: the type comes from the category). Using one
  creates a normal transaction dated today through `POST /transactions`.
- Bulk routes answer `{ deleted }` / `{ updated }`. Ids that are not the user's are skipped silently (they just do not
  count), so the response never reveals whether another user's id exists. `updated` counts transactions that really changed.
- Quick add fields are derived state: what the smart text understood is shown in the fields, and a field the user edits by
  hand is no longer overwritten by the text.
- Amount parser: `35k`, `1.2tr`, `1,2tr`, `2m` use `.`/`,` as the decimal mark when there is one separator; without a
  suffix, `.`/`,` followed by exactly 3 digits are thousands marks (`35.000`, `1,500,000`).
- Undo: closing the tab or pressing F5 inside the 5 seconds keeps the transaction (nothing was sent yet), which is the safe side.
- The trash button and the Delete button of the edit dialog no longer ask "Are you sure?": Undo replaces the question.
  `DeleteTransactionDialog.jsx` (+ its css) is not used any more; it was left in place (no files are deleted without asking).
- The Pager and the header count subtract the rows that wait for their Undo, so the numbers match what is on screen.
