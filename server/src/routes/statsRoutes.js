import { Router } from "express";
import { summary } from "../controllers/statsController.js";
import { validateStatsSummary } from "../middlewares/validateStats.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every stats route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /stats/summary:
 *   get:
 *     summary: Dashboard numbers of a month (totals, expense per category, last 6 months)
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         description: |
 *           Month as YYYY-MM in Vietnam time (UTC+7). Defaults to the current month.
 *           "2026-10" covers 2026-10-01T00:00+07:00 (inclusive) to 2026-11-01T00:00+07:00 (exclusive).
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
 *           example: VND
 *     responses:
 *       200:
 *         description: |
 *           The numbers of the signed-in user, computed with MongoDB aggregation. balance = totalIncome - totalExpense of the month.
 *           expenseByCategory: expense categories only, largest total first; a category without expenses that month is left out.
 *           byMonth: always 6 months, oldest first, ending with the chosen month; a month without transactions has 0.
 *           Every transaction counts in its month in Vietnam time.
 *           Example request - October 2026 in VND:
 *           GET /api/stats/summary?month=2026-10
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
 *                     month:
 *                       type: string
 *                       example: "2026-10"
 *                     currency:
 *                       type: string
 *                       example: VND
 *                     totalIncome:
 *                       type: number
 *                       example: 21500000
 *                     totalExpense:
 *                       type: number
 *                       example: 13600000
 *                     balance:
 *                       type: number
 *                       example: 7900000
 *                     expenseByCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoryId:
 *                             type: string
 *                             example: 6720b1b2c3d4e5f601234568
 *                           name:
 *                             type: string
 *                             example: Food
 *                           color:
 *                             type: string
 *                             example: "#F07D62"
 *                           total:
 *                             type: number
 *                             example: 4800000
 *                     byMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             example: "2026-10"
 *                           income:
 *                             type: number
 *                             example: 21500000
 *                           expense:
 *                             type: number
 *                             example: 13600000
 *             example:
 *               success: true
 *               data:
 *                 month: "2026-10"
 *                 currency: VND
 *                 totalIncome: 21500000
 *                 totalExpense: 13600000
 *                 balance: 7900000
 *                 expenseByCategory:
 *                   - { categoryId: 6720b1b2c3d4e5f601234568, name: Food, color: "#F07D62", total: 4800000 }
 *                   - { categoryId: 6720b1b2c3d4e5f601234571, name: Bills, color: "#F19A52", total: 3200000 }
 *                   - { categoryId: 6720b1b2c3d4e5f601234572, name: Shopping, color: "#7D8CE8", total: 2600000 }
 *                   - { categoryId: 6720b1b2c3d4e5f601234573, name: Transport, color: "#4A9FE3", total: 1700000 }
 *                   - { categoryId: 6720b1b2c3d4e5f601234574, name: Entertainment, color: "#22ADA3", total: 1300000 }
 *                 byMonth:
 *                   - { month: "2026-05", income: 18500000, expense: 12100000 }
 *                   - { month: "2026-06", income: 18500000, expense: 14800000 }
 *                   - { month: "2026-07", income: 21000000, expense: 13200000 }
 *                   - { month: "2026-08", income: 18500000, expense: 16400000 }
 *                   - { month: "2026-09", income: 19200000, expense: 11900000 }
 *                   - { month: "2026-10", income: 21500000, expense: 13600000 }
 *       400:
 *         description: Invalid query ("Month must be in YYYY-MM format", "Currency must be a 3-letter ISO code")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/summary", validateStatsSummary, summary);

export default router;
