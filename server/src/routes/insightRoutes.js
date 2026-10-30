import { Router } from "express";
import { insights } from "../controllers/reportController.js";
import { validateMonthQuery } from "../middlewares/validateReports.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /insights:
 *   get:
 *     summary: Up to 6 tips about a month, built from simple rules (no AI)
 *     description: |
 *       First creates the transactions of my recurring rules that are due up to today (see the Recurring tag).
 *       The rules, in English sentences:
 *       - `category-up` (warning) / `category-down` (success): the category whose spending changed the most in money from
 *         last month, when it changed by 20% or more (last month must be above 0).
 *       - `budget-forecast` (warning, current month only, VND only): at the pace of spending so far
 *         (spent / days passed * days in the month) a budget will be passed. At most 2 budgets.
 *       - `no-spend-days`: finished days without an expense (success from 5 days, otherwise info).
 *       - `savings-rate`: (income - expense) / income. 20% or more is success, 0-19% info, below 0 or no income warning.
 *       - `largest-expense` (info): the biggest single expense, linked to its day.
 *
 *       The list is sorted warning, success, info and has at most 6 items. A month without transactions returns an empty list.
 *     tags: [Insights]
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
 *         description: Only transactions in this currency are used (ISO 4217 code in upper case)
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{3}$'
 *           default: VND
 *     responses:
 *       200:
 *         description: |
 *           Each insight has a `type`, a `severity` (info, warning or success), an English `message` and a `link`
 *           to the page of the app that shows the details.
 *           Example request: GET /api/insights?month=2026-10
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
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [category-up, category-down, budget-forecast, no-spend-days, savings-rate, largest-expense]
 *                             example: savings-rate
 *                           severity: { type: string, enum: [info, warning, success], example: success }
 *                           message: { type: string, example: "Great! You saved 94% of your income in October 2026." }
 *                           link: { type: string, example: "/reports?tab=monthly&month=2026-10" }
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
router.get("/", validateMonthQuery, insights);

export default router;
