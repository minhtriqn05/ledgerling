import { Router } from "express";
import { list, create, getOne, update, remove } from "../controllers/transactionController.js";
import {
  validateCreateTransaction,
  validateListTransactions,
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
 *     summary: List my transactions of a month (newest first)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         description: Month in Vietnam time (UTC+7). Defaults to the current month.
 *         schema:
 *           type: string
 *           example: "2026-10"
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The transactions of the signed-in user
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
 *       400:
 *         description: Invalid filter ("Month must be in YYYY-MM format", "Type must be income or expense", "Category id is invalid")
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
router.get("/", validateListTransactions, list);

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
 *                 example: 6720b1b2c3d4e5f601234568
 *               amount:
 *                 type: number
 *                 example: 45000
 *               currency:
 *                 type: string
 *                 example: VND
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 example: Lunch
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-27T12:30:00+07:00"
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
 *         description: Invalid input ("Category id is invalid", "Amount must be greater than 0", "Currency must be a 3-letter ISO code", "Note must be at most 200 characters", "Date is invalid")
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
 *       404:
 *         description: Category not found (or it belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", validateCreateTransaction, create);

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
 *         description: Token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found (or it belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 example: VND
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 example: Lunch with friends
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-27T12:30:00+07:00"
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
 *       401:
 *         description: Token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction or category not found (or it belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         description: Token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found (or it belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", validateTransactionId, remove);

export default router;
