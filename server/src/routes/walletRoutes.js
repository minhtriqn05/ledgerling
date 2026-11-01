import { Router } from "express";
import { list, getOne, create, update, remove } from "../controllers/walletController.js";
import { validateCreateWallet, validateUpdateWallet, validateWalletId } from "../middlewares/validateWallet.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every wallet route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /wallets:
 *   get:
 *     summary: List my wallets with their balances
 *     description: |
 *       Wallets in use first, the default wallet at the top. The first call of a user creates the default Cash wallet.
 *       balance = initialBalance + income - expense + transfersIn - transfersOut, VND transactions only.
 *       A transaction saved before wallets existed counts in the default wallet.
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The wallets of the signed-in user
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
 *                     $ref: '#/components/schemas/Wallet'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", list);

/**
 * @openapi
 * /wallets:
 *   post:
 *     summary: Create a wallet
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, color]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 30
 *                 example: Vietcombank
 *               type:
 *                 type: string
 *                 enum: [cash, bank, ewallet]
 *                 example: bank
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: "#4A9FE3"
 *               initialBalance:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 example: 5000000
 *     responses:
 *       201:
 *         description: Wallet created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       400:
 *         description: Invalid input (NAME_REQUIRED, NAME_TOO_LONG, WALLET_TYPE_INVALID, COLOR_INVALID, WALLET_BALANCE_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Initial balance must be 0 or more
 *               code: WALLET_BALANCE_INVALID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: A wallet with this name already exists (case-insensitive)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet already exists
 *               code: WALLET_EXISTS
 */
router.post("/", validateCreateWallet, create);

/**
 * @openapi
 * /wallets/{id}:
 *   get:
 *     summary: Get one of my wallets with its balance
 *     tags: [Wallets]
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
 *         description: The wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Wallet not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet not found
 *               code: WALLET_NOT_FOUND
 */
router.get("/:id", validateWalletId, getOne);

/**
 * @openapi
 * /wallets/{id}:
 *   patch:
 *     summary: Update a wallet, or archive it and bring it back
 *     description: An archived wallet keeps its balance but takes no new transactions or transfers. The default wallet cannot be archived.
 *     tags: [Wallets]
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
 *               name:
 *                 type: string
 *                 maxLength: 30
 *                 example: Techcombank
 *               type:
 *                 type: string
 *                 enum: [cash, bank, ewallet]
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: "#22ADA3"
 *               initialBalance:
 *                 type: number
 *                 minimum: 0
 *                 example: 2000000
 *               archived:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: The updated wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       400:
 *         description: Invalid input ("Nothing to update", NAME_REQUIRED, NAME_TOO_LONG, WALLET_TYPE_INVALID, COLOR_INVALID, WALLET_BALANCE_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Nothing to update
 *               code: VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Wallet not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet not found
 *               code: WALLET_NOT_FOUND
 *       409:
 *         description: The name is taken (WALLET_EXISTS), or the default wallet cannot be archived (WALLET_DEFAULT_LOCKED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: The default wallet cannot be archived
 *               code: WALLET_DEFAULT_LOCKED
 */
router.patch("/:id", validateWalletId, validateUpdateWallet, update);

/**
 * @openapi
 * /wallets/{id}:
 *   delete:
 *     summary: Delete a wallet (409 if it is the default wallet or has a history)
 *     tags: [Wallets]
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
 *                       example: 6720f1b2c3d4e5f601234601
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Wallet not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet not found
 *               code: WALLET_NOT_FOUND
 *       409:
 *         description: The wallet has transactions or transfers (WALLET_IN_USE, archive it instead), or it is the default wallet (WALLET_DEFAULT_LOCKED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Wallet still has transactions or transfers
 *               code: WALLET_IN_USE
 */
router.delete("/:id", validateWalletId, remove);

export default router;
