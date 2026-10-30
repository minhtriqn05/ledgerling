import { Router } from "express";
import { list, exportCsv, importCsv, create, getOne, update, remove } from "../controllers/transactionController.js";
import {
  validateCreateTransaction,
  validateListTransactions,
  validateExportTransactions,
  validateImportTransactions,
  validateUpdateTransaction,
  validateTransactionId,
} from "../middlewares/validateTransaction.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every transaction route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /transactions:
 *   get:
 *     summary: List my transactions (search, sort, date range, one page at a time)
 *     description: First creates the transactions of my recurring rules that are due up to today (see the Recurring tag).
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         description: |
 *           Month as YYYY-MM in Vietnam time (UTC+7). Used when neither from nor to is sent; defaults to the current month.
 *           "2026-10" covers 2026-10-01T00:00+07:00 (inclusive) to 2026-11-01T00:00+07:00 (exclusive).
 *           Cannot be sent together with from or to.
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *           example: "2026-10"
 *       - in: query
 *         name: from
 *         required: false
 *         description: |
 *           First day (inclusive) as YYYY-MM-DD, from 00:00 Vietnam time. "2026-10-15" starts at 2026-10-15T00:00+07:00.
 *           Without to, the range has no end.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *       - in: query
 *         name: to
 *         required: false
 *         description: |
 *           Last day (inclusive, the whole day) as YYYY-MM-DD, Vietnam time. "2026-10-31" ends before 2026-11-01T00:00+07:00.
 *           Without from, the range has no start. Must not be before from.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-10-31"
 *       - in: query
 *         name: type
 *         required: false
 *         description: Only income or only expense transactions
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *           example: expense
 *       - in: query
 *         name: categoryId
 *         required: false
 *         description: Only transactions of this category
 *         schema:
 *           type: string
 *           example: 6720b1b2c3d4e5f601234568
 *       - in: query
 *         name: tag
 *         required: false
 *         description: Only transactions that have this tag (one tag; upper case is converted to lower case)
 *         schema:
 *           type: string
 *           pattern: '^[a-z0-9-]{1,20}$'
 *           example: work
 *       - in: query
 *         name: q
 *         required: false
 *         description: |
 *           Search in the note, ignoring upper / lower case ("lunch" finds "Lunch with team"). Trimmed; empty is ignored.
 *           Special characters like "(" or "." are matched as plain text. Accents are not ignored ("an" does not find "ăn").
 *         schema:
 *           type: string
 *           maxLength: 100
 *           example: lunch
 *       - in: query
 *         name: sort
 *         required: false
 *         description: |
 *           "date" = oldest first, "-date" = newest first, "amount" = smallest first, "-amount" = biggest first.
 *           Ties keep a fixed order (date, then createdAt / _id), so pages never overlap.
 *         schema:
 *           type: string
 *           enum: [date, -date, amount, -amount]
 *           default: -date
 *           example: -amount
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number. A page after the last one returns an empty array.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 2
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Transactions per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           example: 20
 *     responses:
 *       200:
 *         description: |
 *           One page of the signed-in user's transactions that match all the filters, and meta about the pages.
 *           Example request - second page of October 2026 expenses with "lunch" in the note, biggest first:
 *           GET /api/transactions?month=2026-10&type=expense&q=lunch&sort=-amount&page=2&limit=20
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6720c1b2c3d4e5f601234570
 *                   category: { _id: 6720b1b2c3d4e5f601234568, name: Food, color: "#FF7043" }
 *                   type: expense
 *                   amount: 85000
 *                   currency: VND
 *                   note: Dinner
 *                   date: "2026-10-27T11:30:00.000Z"
 *                   createdAt: "2026-10-27T11:31:00.000Z"
 *                   updatedAt: "2026-10-27T11:31:00.000Z"
 *                 - _id: 6720c1b2c3d4e5f601234569
 *                   category: { _id: 6720b1b2c3d4e5f601234568, name: Food, color: "#FF7043" }
 *                   type: expense
 *                   amount: 45000
 *                   currency: VND
 *                   note: Lunch
 *                   date: "2026-10-27T05:30:00.000Z"
 *                   createdAt: "2026-10-27T05:31:00.000Z"
 *                   updatedAt: "2026-10-27T05:31:00.000Z"
 *               meta: { page: 1, limit: 20, total: 2, totalPages: 1 }
 *       400:
 *         description: |
 *           Invalid filter: "Use either month or from/to, not both", "Month must be in YYYY-MM format",
 *           "From must be a date in YYYY-MM-DD format", "To must be a date in YYYY-MM-DD format",
 *           "From must be before or equal to to", "Type must be income or expense", "Category id is invalid",
 *           "Each tag must be 1-20 letters, digits or hyphens",
 *           "Search must be a string", "Search must be at most 100 characters",
 *           "Sort must be one of date, -date, amount, -amount", "Page must be a whole number from 1",
 *           "Limit must be a whole number from 1 to 100"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Use either month or from/to, not both
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", validateListTransactions, list);

/**
 * @openapi
 * /transactions/export:
 *   get:
 *     summary: Download my transactions as a CSV file (same filters as the list, no paging)
 *     description: |
 *       Columns: Date (Vietnam time, YYYY-MM-DD HH:mm), Type, Category, Amount, Currency, Note, Tags (separated by ";").
 *       The file can be sent back to POST /transactions/import (after it is read into JSON rows).
 *       At most 5000 rows; if more match, only the first 5000 of the chosen sort are in the file.
 *       The file starts with a UTF-8 BOM (so Excel shows accents correctly), cells with a comma, a double quote or
 *       a line break are quoted, and a cell that starts with = + - @ gets a ' in front (CSV injection).
 *       Declared before /transactions/{id}, so "export" is never read as an id.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         description: Month as YYYY-MM in Vietnam time. Used when neither from nor to is sent; defaults to the current month. Cannot be sent together with from or to.
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *           example: "2026-10"
 *       - in: query
 *         name: from
 *         required: false
 *         description: First day (inclusive) as YYYY-MM-DD, from 00:00 Vietnam time.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-10-01"
 *       - in: query
 *         name: to
 *         required: false
 *         description: Last day (inclusive, the whole day) as YYYY-MM-DD, Vietnam time. Must not be before from.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-10-31"
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *           example: expense
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: string
 *           example: 6720b1b2c3d4e5f601234568
 *       - in: query
 *         name: tag
 *         required: false
 *         description: Only transactions that have this tag
 *         schema:
 *           type: string
 *           pattern: '^[a-z0-9-]{1,20}$'
 *           example: work
 *       - in: query
 *         name: q
 *         required: false
 *         description: Search in the note, ignoring upper / lower case (max 100 characters)
 *         schema:
 *           type: string
 *           maxLength: 100
 *           example: lunch
 *       - in: query
 *         name: sort
 *         required: false
 *         description: Order of the rows
 *         schema:
 *           type: string
 *           enum: [date, -date, amount, -amount]
 *           default: -date
 *     responses:
 *       200:
 *         description: |
 *           The CSV file. The name is ledgerling-YYYY-MM.csv for a month (default: current month)
 *           and ledgerling-FROM_TO.csv for a date range.
 *         headers:
 *           Content-Disposition:
 *             description: Makes the browser download the file
 *             schema:
 *               type: string
 *               example: attachment; filename="ledgerling-2026-10.csv"
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: "Date,Type,Category,Amount,Currency,Note,Tags\r\n2026-10-27 12:30,expense,Food,45000,VND,Lunch,work\r\n2026-10-27 18:30,expense,Food,85000,VND,\"Dinner, with team\",work;trip\r\n"
 *       400:
 *         description: |
 *           Invalid filter (same messages as GET /transactions, except for page and limit, which are ignored here),
 *           e.g. "Use either month or from/to, not both"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Use either month or from/to, not both
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/export", validateExportTransactions, exportCsv);

/**
 * @openapi
 * /transactions:
 *   post:
 *     summary: Create a transaction (type is copied from the category)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, amount]
 *             properties:
 *               categoryId:
 *                 type: string
 *                 description: Id of one of your categories (GET /categories)
 *                 example: 6720b1b2c3d4e5f601234568
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: true
 *                 minimum: 0
 *                 example: 45000
 *               currency:
 *                 type: string
 *                 description: ISO 4217 code, 3 letters (lower case is converted to upper case)
 *                 default: VND
 *                 example: VND
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 default: ""
 *                 example: Lunch
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601, defaults to now
 *                 example: "2026-10-27T12:30:00+07:00"
 *               tags:
 *                 type: array
 *                 maxItems: 5
 *                 description: Up to 5 tags, each 1-20 letters, digits or hyphens. Upper case is converted to lower case and duplicates are removed.
 *                 default: []
 *                 items:
 *                   type: string
 *                 example: [work, team-lunch]
 *     responses:
 *       201:
 *         description: Transaction created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input ("Category id is invalid", "Amount must be greater than 0", "Currency must be a 3-letter ISO code", "Note must be a string", "Note must be at most 200 characters", "Date is invalid, use ISO 8601 like 2026-10-27T12:30:00+07:00", "Tags must be an array", "Each tag must be 1-20 letters, digits or hyphens", "A transaction can have at most 5 tags")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Amount must be greater than 0
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (it does not exist or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 */
router.post("/", validateCreateTransaction, create);

/**
 * @openapi
 * /transactions/import:
 *   post:
 *     summary: Import transactions from the rows of a CSV file (good rows are saved, bad rows are listed)
 *     description: |
 *       The app reads the CSV in the browser and sends the rows here as JSON, 1 to 500 rows at a time.
 *       Each row is checked like a new transaction. The category is found by its name and type among the
 *       categories of the signed-in user (upper / lower case ignored); a category that does not exist is an error
 *       for that row, an import never creates categories. Only the valid rows are saved.
 *       The answer is 200 even when some rows are refused: look at `failed` and `errors`.
 *       Sending the same rows twice saves them twice.
 *       Declared before /transactions/{id}.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rows]
 *             properties:
 *               rows:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [type, category, amount]
 *                   properties:
 *                     date:
 *                       type: string
 *                       description: |
 *                         "YYYY-MM-DD HH:mm" or "YYYY-MM-DD" (Vietnam time, the format of the export) or ISO 8601
 *                         with an offset. Empty = now.
 *                       example: "2026-10-27 12:30"
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     category:
 *                       type: string
 *                       description: Name of one of your categories of this type
 *                       example: Food
 *                     amount:
 *                       type: number
 *                       description: JSON number greater than 0
 *                       example: 45000
 *                     currency:
 *                       type: string
 *                       description: 3 letters, empty = VND
 *                       example: VND
 *                     note:
 *                       type: string
 *                       maxLength: 200
 *                       example: Lunch
 *                     tags:
 *                       type: array
 *                       maxItems: 5
 *                       items:
 *                         type: string
 *                       example: [work]
 *           example:
 *             rows:
 *               - { date: "2026-10-27 12:30", type: expense, category: Food, amount: 45000, currency: VND, note: Lunch, tags: [work] }
 *               - { date: "2026-10-28", type: expense, category: Unknown, amount: 10000 }
 *     responses:
 *       200:
 *         description: |
 *           `imported` rows were saved, `failed` were refused. `errors[].row` is the position of the row in the
 *           request (1 = the first row).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: integer
 *                       example: 1
 *                     failed:
 *                       type: integer
 *                       example: 1
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                             example: 2
 *                           message:
 *                             type: string
 *                             example: Category "Unknown" (expense) not found
 *       400:
 *         description: 'The body is not usable: "Rows must be a non-empty array", "You can import at most 500 rows at a time"'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: You can import at most 500 rows at a time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/import", validateImportTransactions, importCsv);

/**
 * @openapi
 * /transactions/{id}:
 *   get:
 *     summary: Get one of my transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Transaction not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Transaction not found
 */
router.get("/:id", validateTransactionId, getOne);

/**
 * @openapi
 * /transactions/{id}:
 *   patch:
 *     summary: Update a transaction (if categoryId changes, type is copied again from the new category)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one field
 *             properties:
 *               categoryId:
 *                 type: string
 *                 example: 6720b1b2c3d4e5f601234568
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: true
 *                 minimum: 0
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 description: ISO 4217 code, 3 letters (lower case is converted to upper case)
 *                 example: VND
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 example: Lunch with friends
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-27T12:30:00+07:00"
 *               tags:
 *                 type: array
 *                 maxItems: 5
 *                 description: Replaces all the tags of the transaction. [] removes them.
 *                 items:
 *                   type: string
 *                 example: [work]
 *     responses:
 *       200:
 *         description: The updated transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input ("Nothing to update" or the same messages as create)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Nothing to update
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Transaction or category not found (or it belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: The new date is already used by another transaction of the same recurring rule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Duplicate value
 */
router.patch("/:id", validateTransactionId, validateUpdateTransaction, update);

/**
 * @openapi
 * /transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted, returns the id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6720c1b2c3d4e5f601234569
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Transaction not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Transaction not found
 */
router.delete("/:id", validateTransactionId, remove);

export default router;
