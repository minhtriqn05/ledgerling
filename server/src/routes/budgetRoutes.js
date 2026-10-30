import { Router } from "express";
import { list, create, update, remove } from "../controllers/budgetController.js";
import {
  validateCreateBudget,
  validateListBudgets,
  validateUpdateBudget,
  validateBudgetId,
} from "../middlewares/validateBudget.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every budget route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /budgets:
 *   get:
 *     summary: List my budgets of a month, each with how much is already spent
 *     tags: [Budgets]
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
 *     responses:
 *       200:
 *         description: |
 *           The budgets of the signed-in user for the month, sorted by category name.
 *           spent = total VND expense of the category in the month (other currencies are not counted).
 *           remaining = amount - spent (negative when over budget). percent = spent / amount, rounded down.
 *           status: ok (below 80%), warning (80-99%), exceeded (100% or more).
 *           Example request - October 2026:
 *           GET /api/budgets?month=2026-10
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
 *                     $ref: '#/components/schemas/Budget'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6720d1b2c3d4e5f601234580
 *                   category: { _id: 6720b1b2c3d4e5f601234571, name: Bills, color: "#F19A52" }
 *                   month: "2026-10"
 *                   amount: 3000000
 *                   spent: 3200000
 *                   remaining: -200000
 *                   percent: 106
 *                   status: exceeded
 *                   createdAt: "2026-10-01T02:00:00.000Z"
 *                   updatedAt: "2026-10-01T02:00:00.000Z"
 *                 - _id: 6720d1b2c3d4e5f601234581
 *                   category: { _id: 6720b1b2c3d4e5f601234568, name: Food, color: "#F07D62" }
 *                   month: "2026-10"
 *                   amount: 5000000
 *                   spent: 4250000
 *                   remaining: 750000
 *                   percent: 85
 *                   status: warning
 *                   createdAt: "2026-10-01T02:01:00.000Z"
 *                   updatedAt: "2026-10-01T02:01:00.000Z"
 *       400:
 *         description: Month must be in YYYY-MM format
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
router.get("/", validateListBudgets, list);

/**
 * @openapi
 * /budgets:
 *   post:
 *     summary: Create a monthly budget for one of my expense categories
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, month, amount]
 *             properties:
 *               categoryId:
 *                 type: string
 *                 description: Id of one of your expense categories (GET /categories?type=expense)
 *                 example: 6720b1b2c3d4e5f601234568
 *               month:
 *                 type: string
 *                 pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *                 example: "2026-10"
 *               amount:
 *                 type: number
 *                 description: Spending limit in VND
 *                 exclusiveMinimum: true
 *                 minimum: 0
 *                 example: 5000000
 *     responses:
 *       201:
 *         description: Budget created, returned with spent, remaining, percent and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Budget'
 *       400:
 *         description: Invalid input ("Category id is invalid", "Month must be in YYYY-MM format", "Amount must be greater than 0", "Budgets are only for expense categories")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Budgets are only for expense categories
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (the id does not exist or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *       409:
 *         description: This category already has a budget for this month
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Budget already exists for this category and month
 */
router.post("/", validateCreateBudget, create);

/**
 * @openapi
 * /budgets/{id}:
 *   patch:
 *     summary: Change the amount of a budget (category and month cannot be changed)
 *     tags: [Budgets]
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
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: true
 *                 minimum: 0
 *                 example: 6000000
 *     responses:
 *       200:
 *         description: The updated budget, with spent, remaining, percent and status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Budget'
 *       400:
 *         description: Invalid input ("Nothing to update", "Only the amount can be changed", "Amount must be greater than 0")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Only the amount can be changed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Budget not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Budget not found
 */
router.patch("/:id", validateBudgetId, validateUpdateBudget, update);

/**
 * @openapi
 * /budgets/{id}:
 *   delete:
 *     summary: Delete a budget (its transactions are not touched)
 *     tags: [Budgets]
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
 *                       example: 6720d1b2c3d4e5f601234580
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Budget not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Budget not found
 */
router.delete("/:id", validateBudgetId, remove);

export default router;
