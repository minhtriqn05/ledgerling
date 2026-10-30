import { Router } from "express";
import { list, create, update, toggle, remove } from "../controllers/recurringController.js";
import { validateRecurringRule, validateRecurringId } from "../middlewares/validateRecurring.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every recurring rule route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /recurring:
 *   get:
 *     summary: List my recurring rules
 *     description: |
 *       First creates every transaction that is due up to today (see the Recurring tag), so nextRunDate is never in
 *       the past for an active rule, unless the rule has more than 60 due dates or has ended.
 *       Active rules come first, then the rule that runs soonest.
 *     tags: [Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The rules of the signed-in user
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
 *                     $ref: '#/components/schemas/RecurringRule'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", list);

/**
 * @openapi
 * /recurring:
 *   post:
 *     summary: Create a recurring rule
 *     description: |
 *       The first run is startDate. A startDate in the past is allowed: the missed transactions are created
 *       the next time GET /transactions, /stats/summary, /budgets or /recurring is called.
 *     tags: [Recurring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecurringRuleInput'
 *     responses:
 *       201:
 *         description: Rule created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RecurringRule'
 *       400:
 *         description: Invalid input ("Start date must be a date in YYYY-MM-DD format", "End date must be after the start date", "Category id is invalid", "Amount must be greater than 0", "Frequency must be weekly or monthly", "Note must be at most 200 characters")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Frequency must be weekly or monthly
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
 */
router.post("/", validateRecurringRule, create);

/**
 * @openapi
 * /recurring/{id}:
 *   put:
 *     summary: Replace a recurring rule
 *     description: |
 *       Send the whole rule: a missing note becomes empty and a missing endDate removes the end date.
 *       Changing frequency or startDate recalculates nextRunDate: the first date of the new schedule after the last
 *       transaction the rule created (startDate if it has created none).
 *       Transactions already created are never changed.
 *     tags: [Recurring]
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
 *             $ref: '#/components/schemas/RecurringRuleInput'
 *     responses:
 *       200:
 *         description: The updated rule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RecurringRule'
 *       400:
 *         description: Invalid input (same messages as POST /recurring)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: End date must be after the start date
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Rule or category not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Recurring rule not found
 */
router.put("/:id", validateRecurringId, validateRecurringRule, update);

/**
 * @openapi
 * /recurring/{id}/toggle:
 *   patch:
 *     summary: Turn a recurring rule on or off
 *     description: |
 *       A rule that is off creates nothing. Turning it back on skips the dates that passed while it was off:
 *       nextRunDate becomes the first date of the schedule from today on.
 *     tags: [Recurring]
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
 *         description: The rule with its new active value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RecurringRule'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Rule not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Recurring rule not found
 */
router.patch("/:id/toggle", validateRecurringId, toggle);

/**
 * @openapi
 * /recurring/{id}:
 *   delete:
 *     summary: Delete a recurring rule (the transactions it created are kept)
 *     tags: [Recurring]
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
 *                       example: 6720e1b2c3d4e5f601234590
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Rule not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Recurring rule not found
 */
router.delete("/:id", validateRecurringId, remove);

export default router;
