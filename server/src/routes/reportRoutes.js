import { Router } from "express";
import { monthly, yearly } from "../controllers/reportController.js";
import { validateMonthQuery, validateYearQuery } from "../middlewares/validateReports.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every report route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /reports/monthly:
 *   get:
 *     summary: Report of one month, compared with the month before
 *     description: |
 *       First creates the transactions of my recurring rules that are due up to today (see the Recurring tag).
 *       Every day and month is read in Vietnam time (UTC+7), so an expense at 23:30 on the last day of a month
 *       counts in that month and on that day. Only transactions in one currency are summed.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         description: Month as YYYY-MM in Vietnam time. Defaults to the current month.
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *           example: "2026-10"
 *       - in: query
 *         name: currency
 *         required: false
 *         description: Only transactions in this currency are summed (ISO 4217 code in upper case)
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *           default: VND
 *     responses:
 *       200:
 *         description: |
 *           - `totals` / `previousTotals`: income, expense and balance (income - expense) of the month and of the month before.
 *           - `changes`: percent change from last month with 1 decimal (`12.5`, `-8`); `null` when last month was 0.
 *             A positive expense change means MORE spending.
 *           - `topCategories`: up to 5 expense categories, biggest first. `percent` is the share of the month's expense,
 *             `changePercent` the change from the same category last month (`null` when it was 0). `icon` is `null` when the category has none.
 *           - `dailyExpense`: one entry for EVERY day of the month, 0 for days without expenses.
 *           - `averagePerDay`: expense / days that have started (the whole month for a past month, up to today for the current
 *             month, 0 for a future month), rounded to a whole number.
 *           - `noSpendDays`: finished days without any expense (today is not counted, it may still get one).
 *           - `largestExpense`: the biggest single expense, or `null` when there is none.
 *           - `topTags`: up to 5 tags with the most expense. A transaction with 2 tags counts in both.
 *
 *           A month without transactions returns zeros, empty lists and `null`s (never an error).
 *           Example request: GET /api/reports/monthly?month=2026-10
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
 *                     month: { type: string, example: "2026-10" }
 *                     currency: { type: string, example: VND }
 *                     totals:
 *                       type: object
 *                       properties:
 *                         income: { type: number, example: 21500000 }
 *                         expense: { type: number, example: 1250000 }
 *                         balance: { type: number, example: 20250000 }
 *                     previousMonth: { type: string, example: "2026-09" }
 *                     previousTotals:
 *                       type: object
 *                       properties:
 *                         income: { type: number, example: 18500000 }
 *                         expense: { type: number, example: 1000000 }
 *                         balance: { type: number, example: 17500000 }
 *                     changes:
 *                       type: object
 *                       properties:
 *                         income: { type: number, nullable: true, example: 16.2 }
 *                         expense: { type: number, nullable: true, example: 25 }
 *                         balance: { type: number, nullable: true, example: 15.7 }
 *                     topCategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoryId: { type: string, example: 6720b1b2c3d4e5f601234568 }
 *                           name: { type: string, example: Bills }
 *                           color: { type: string, example: "#F19A52" }
 *                           icon: { type: string, nullable: true, example: null }
 *                           total: { type: number, example: 1000000 }
 *                           percent: { type: number, example: 80 }
 *                           previousTotal: { type: number, example: 800000 }
 *                           changePercent: { type: number, nullable: true, example: 25 }
 *                     dailyExpense:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, example: "2026-10-01" }
 *                           total: { type: number, example: 0 }
 *                     averagePerDay: { type: number, example: 40323 }
 *                     noSpendDays: { type: integer, example: 27 }
 *                     largestExpense:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         _id: { type: string, example: 6720c1b2c3d4e5f601234569 }
 *                         amount: { type: number, example: 1000000 }
 *                         note: { type: string, example: Electricity }
 *                         date: { type: string, format: date-time, example: "2026-10-10T02:00:00.000Z" }
 *                         category:
 *                           type: object
 *                           properties:
 *                             _id: { type: string, example: 6720b1b2c3d4e5f601234568 }
 *                             name: { type: string, example: Bills }
 *                             color: { type: string, example: "#F19A52" }
 *                             icon: { type: string, nullable: true, example: null }
 *                     topTags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tag: { type: string, example: work }
 *                           total: { type: number, example: 250000 }
 *                           count: { type: integer, example: 3 }
 *       400:
 *         description: Invalid query ("Month must be in YYYY-MM format", "Currency must be a 3-letter ISO code")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Month must be in YYYY-MM format
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/monthly", validateMonthQuery, monthly);

/**
 * @openapi
 * /reports/yearly:
 *   get:
 *     summary: Income and expense of the 12 months of a year
 *     description: |
 *       First creates the transactions of my recurring rules that are due up to today (see the Recurring tag).
 *       Months are read in Vietnam time (UTC+7). Only transactions in one currency are summed.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: false
 *         description: A 4-digit year from 1970 to 2100. Defaults to the current year in Vietnam time.
 *         schema:
 *           type: string
 *           pattern: '^\d{4}$'
 *           example: "2026"
 *       - in: query
 *         name: currency
 *         required: false
 *         description: Only transactions in this currency are summed (ISO 4217 code in upper case)
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *           default: VND
 *     responses:
 *       200:
 *         description: |
 *           `months` always has 12 entries, January first; a month without transactions has 0.
 *           `totals` are the sums of the 12 months. `topExpenseMonth` is the month with the most expense
 *           (the earlier month when two are equal), or `null` when the whole year has no expenses.
 *           Example request: GET /api/reports/yearly?year=2026
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
 *                     year: { type: integer, example: 2026 }
 *                     currency: { type: string, example: VND }
 *                     months:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: "2026-10" }
 *                           income: { type: number, example: 21500000 }
 *                           expense: { type: number, example: 1250000 }
 *                           balance: { type: number, example: 20250000 }
 *                     totals:
 *                       type: object
 *                       properties:
 *                         income: { type: number, example: 21500000 }
 *                         expense: { type: number, example: 1550000 }
 *                         balance: { type: number, example: 19950000 }
 *                     topExpenseMonth:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         month: { type: string, example: "2026-10" }
 *                         expense: { type: number, example: 1250000 }
 *       400:
 *         description: Invalid query ("Year must be a 4-digit year from 1970 to 2100", "Currency must be a 3-letter ISO code")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Year must be a 4-digit year from 1970 to 2100
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/yearly", validateYearQuery, yearly);

export default router;
