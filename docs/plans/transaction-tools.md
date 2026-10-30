# Plan: Transaction tools (phase 12)

Branch: `feature/transaction-tools`.

Done when: search, sort, date range, tag filter and paging work; F5 keeps the filters; a CSV exported from the
app can be imported again, unchanged.

## Audit of what already exists (merged from `feature/transactions-search`)
- [x] `GET /api/transactions`: `q` (escaped regex), `sort`, `page`, `limit` (max 100), `from`, `to` (Vietnam time), `month`, `type`, `categoryId`, `meta`
- [x] Index `userId + date`
- [x] `GET /api/transactions/export` (before `/:id`, max 5000 rows, BOM, attachment, CSV injection guard)
- [x] Transactions page: search (300 ms), sort, From/To, Clear filters, Pager, filters in the URL, Export CSV
- [x] Test setup (Vitest + Supertest + in-memory MongoDB, Playwright desktop + mobile)

## Gaps (this phase)
- No tags at all. No `tag` filter, no `GET /api/tags`, no Tags column in the export.
- No import endpoint, no import UI, `papaparse` was not installed.
- No tests for the points above.

## Checklist
### Backend
- [x] `Transaction.tags` (lowercase, max 5, each 1-20 of `a-z 0-9 -`) + index `userId + tags`
- [x] Validation of `tags` on create / update (shared helper) and `tag` on list / export
- [x] `tag` filter in list and export; `Tags` column in the export
- [x] `GET /api/tags` (tag + count, most used first)
- [x] `POST /api/transactions/import` (max 500 rows, per-row validation, category by name + type, errors by row)
- [x] Swagger docs for every new or changed route, `docs/api-plan.md`, `docs/erd.md`
- [x] Tests: tags (create, update, 400), `tag` filter, `/tags`, export (Tags column), import (valid, invalid rows, other user's category, 400, 401)

### Frontend
- [x] `papaparse` installed; `api/tags.js`, `importTransactions`
- [x] `TagInput` (chips + suggestions) in the transaction dialog
- [x] Tag chips in the list; click filters by tag; `tag` in the URL; "Tag: x" chip with remove; Clear filters
- [x] `utils/csvImport.js` (parse, validate row, undo the formula guard) + unit tests
- [x] `ImportDialog` (choose file, preview with error rows marked, Import, result)
- [x] Import CSV button on the page
- [x] Playwright: search + paging + F5; tag + chip filter; export download + import the same file

### Checks
- [x] `cd server && npm test` (129 passed)
- [x] `cd client && npm test` (75 passed)
- [x] `cd client && npm run build`
- [x] `cd client && npm run test:e2e` (16 passed: 8 tests x desktop and mobile; there is no `lint` script)
- [x] Stop every server that was started

## Decisions
- Import always answers 200 with `{ imported, failed, errors }` (a partial import is not an error). A body that is not `{ rows: [1..500 items] }` is 400.
- `errors[].row` is the position of the row among the data rows sent (1 = first row under the CSV header).
- The CSV date is read as Vietnam time when it is `YYYY-MM-DD` or `YYYY-MM-DD HH:mm` (the export format); otherwise as ISO 8601.
- Tags in the CSV are separated by `;`. On import `;`, `,` and spaces all separate tags.
- The export guard `'=` is undone in the browser when the file is read, so the preview shows what will be saved.
- Importing the same file twice creates the rows twice (no duplicate detection).
- Express JSON limit raised from 100 kB to 300 kB so 500 rows with long notes fit.
