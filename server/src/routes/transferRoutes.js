import { Router } from "express";
import { list, create, remove } from "../controllers/transferController.js";
import { validateCreateTransfer, validateListTransfers, validateTransferId } from "../middlewares/validateWallet.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every transfer route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /transfers:
 *   get:
 *     summary: List my transfers, newest first (one page)
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: walletId
 *         required: false
 *         description: Only the transfers from or to this wallet
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: One page of transfers
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
 *                     $ref: '#/components/schemas/Transfer'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Invalid wallet id, page or limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet id is invalid
 *               code: VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: The wallet of the filter does not exist or belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet not found
 *               code: WALLET_NOT_FOUND
 */
router.get("/", validateListTransfers, list);

/**
 * @openapi
 * /transfers:
 *   post:
 *     summary: Move money between two of my wallets
 *     description: Changes the balance of both wallets and nothing else. A transfer is not income or expense, so stats, budgets, reports and insights do not see it. A wallet may go below 0.
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromWalletId, toWalletId, amount]
 *             properties:
 *               fromWalletId:
 *                 type: string
 *                 example: 6720f1b2c3d4e5f601234601
 *               toWalletId:
 *                 type: string
 *                 example: 6720f1b2c3d4e5f601234602
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 999999999999
 *                 description: whole VND, 1 to 999,999,999,999
 *                 example: 300000
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional, now by default
 *                 example: 2026-10-27T12:30:00+07:00
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 example: ATM withdrawal
 *     responses:
 *       201:
 *         description: Transfer created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transfer'
 *       400:
 *         description: Invalid input (TRANSFER_SAME_WALLET, AMOUNT_INVALID, DATE_INVALID, NOTE_TOO_LONG, or a malformed wallet id)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Choose two different wallets
 *               code: TRANSFER_SAME_WALLET
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: A wallet does not exist or belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet not found
 *               code: WALLET_NOT_FOUND
 *       409:
 *         description: A wallet is archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet is archived
 *               code: WALLET_ARCHIVED
 */
router.post("/", validateCreateTransfer, create);

/**
 * @openapi
 * /transfers/{id}:
 *   delete:
 *     summary: Delete a transfer (the money goes back)
 *     tags: [Transfers]
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
 *                       example: 6720f1b2c3d4e5f601234700
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Transfer not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Transfer not found
 *               code: TRANSFER_NOT_FOUND
 */
router.delete("/:id", validateTransferId, remove);

export default router;
