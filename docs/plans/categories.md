# Ledgerling – Categories Feature Plan

Branch: `feature/categories`. API contract: `docs/api-plan.md` §Categories (endpoints 5–9).

## Goal

Every transaction belongs to a category, so categories come before transactions. This feature adds the Category model
and the CRUD endpoints, all protected by `requireAuth`, with Swagger docs. Frontend page comes after the backend is
tested in Postman.

Done when: list / create / get / update / delete work in Postman and Swagger; another user's category answers 404;
a duplicate name + type answers 409.

## Open question (needs the owner's answer before coding)

The request said "PUT", but `docs/api-plan.md` (the contract, endpoint 8) says **PATCH** (send only the fields to
change). Plan: follow `api-plan.md` and use PATCH. It also lists `GET /api/categories/:id`; plan: build it too, because
the contract and the later edit form need it.

## Design decisions

- **Layers:** route → `requireAuth` → validation middleware → controller → service → model (same as auth).
- **Model `Category`:** `userId` (ObjectId, ref User, required, index), `name` (String, required, trim, max 30),
  `type` (enum income | expense, required), `color` (String, required, match `/^#[0-9A-Fa-f]{6}$/`);
  `timestamps: true`; `toJSON` removes `userId` and `__v`.
- **Unique name per user + type, case-insensitive:** compound unique index `{ userId, type, name }` with collation
  `{ locale: "en", strength: 2 }`. The service checks first and throws 409 "Category already exists"; the index is the
  safety net (the error handler already maps code 11000 to 409).
- **Ownership:** every query filters by `{ _id, userId: req.user.id }`. Not found or someone else's → 404
  "Category not found". `userId` is never read from the body.
- **Validation (hand-written, like `validateAuth.js`):** new `validateCategory.js` with `validateCreateCategory`,
  `validateUpdateCategory`, `validateListCategories` (query `type`) and `validateCategoryId` (invalid ObjectId → 404
  "Category not found", so it never becomes a 500 CastError). Bodies are rebuilt with only the allowed fields.
  Messages come from `api-plan.md`.
- **Update:** only `name` and `color`; sending `type` → 400 "Type cannot be changed"; empty → 400 "Nothing to update".
- **Delete:** 409 "Category still has transactions" needs the Transaction model, which does not exist yet. For now
  delete directly; add the check in the transactions feature (note it there).
- **Swagger:** add a `Category` schema to `config/swagger.js`; JSDoc comments on each route.

## Steps (each tested, committed on its own)

**B1 – Model + list/create**
- new `server/src/models/Category.js`
- new `server/src/middlewares/validateCategory.js` (`validateCreateCategory`, `validateListCategories`)
- new `server/src/services/categoryService.js`, `server/src/controllers/categoryController.js`,
  `server/src/routes/categoryRoutes.js`
- `server/src/routes/index.js` → `router.use("/categories", categoryRoutes)`; `config/swagger.js` → `Category` schema
- Test: POST valid → 201; same name again (also `food` vs `Food`) → 409; same name with the other type → 201; bad
  type / color / empty name → 400; no token → 401; GET lists only my categories, `?type=` filters, sorted by type then
  name.
- Commit: `feat: add category model with list and create endpoints`

**B2 – Get one, update, delete**
- `validateCategory.js` + `validateCategoryId`, `validateUpdateCategory`; service, controller, routes + Swagger.
- Test: with a second user's token, GET/PATCH/DELETE on the first user's id → 404; rename to an existing name → 409;
  PATCH `{ "type": "income" }` → 400; `{}` → 400; bad id `abc` → 404; DELETE → 200 `{ _id }`.
- Commit: `feat: add get, update and delete category endpoints`

**B3 – Docs + Postman**
- `docs/postman/ledgerling.postman_collection.json` – Categories folder.
- `docs/api-plan.md` – only if the code differs from it (keep in sync).
- Commit: `docs: add categories to Postman collection`

**B4 – Default categories on register**
- `categoryService.js` + `createDefaultCategories(userId)` (`insertMany`); `authService.register()` calls it right
  after `User.create`. Expense: Food, Transport, Shopping, Bills, Entertainment. Income: Salary, Other Income. Colors
  are the presets from `docs/ui-style.md`.
- Test: register a new account → `GET /api/categories` returns 7 items (sorted by type then name, so the 5
  expense ones first, then the 2 income ones); in Compass each has the new user's `userId`; a second new account gets its own 7.
- Commit: `feat: create default categories on register`

**F – Frontend page** (separate plan after B3 is tested; the style guide may need an answer first).

## Not in this feature

- The "has transactions" check on delete (comes with Transactions).
- Frontend (next step).
