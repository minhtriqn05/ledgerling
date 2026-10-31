import { Router } from "express";
import { stats, users, setStatus } from "../controllers/adminController.js";
import { validateUserList, validateStatusChange } from "../middlewares/validateAdmin.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

// Every admin route needs a valid token (401 otherwise) and the admin role (403 otherwise)
router.use(requireAuth, requireRole("admin"));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Numbers for the Admin page
 *     description: Totals and the last 30 days (Vietnam time, today included, one entry per day). It holds counts only, never data of a user. An "active" user added at least one transaction in the last 7 days.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AdminStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/stats", stats);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List the accounts, newest first
 *     description: Name, email, role, status, creation date and how many transactions each user has. It never returns a password hash or the content of a transaction.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         description: Part of the name or the email (case-insensitive)
 *         schema:
 *           type: string
 *           maxLength: 100
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
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: |
 *           One page of accounts and meta about the pages.
 *           Example request - the second page of the users whose name or email contains "tri":
 *           GET /api/admin/users?q=tri&page=2
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
 *                     $ref: '#/components/schemas/AdminUser'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Invalid input ("Page must be a whole number from 1", "Limit must be a whole number from 1 to 50", "Search must be at most 100 characters")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/users", validateUserList, users);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Disable or enable an account
 *     description: Disabling raises the token version of the user, so every token the user already has stops working (401), and the user cannot log in (403 "Account disabled") until the account is enabled again. You cannot disable yourself or another admin.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 6720a1b2c3d4e5f601234567
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, disabled]
 *                 example: disabled
 *     responses:
 *       200:
 *         description: The user with the new status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Status is not "active" or "disabled" (code STATUS_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Status must be one of active, disabled
 *               code: STATUS_INVALID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Not an admin (code FORBIDDEN), or the target is yourself (CANNOT_DISABLE_SELF) or another admin (CANNOT_DISABLE_ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: You cannot disable your own account
 *               code: CANNOT_DISABLE_SELF
 *       404:
 *         description: No user with this id (code USER_NOT_FOUND)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: User not found
 *               code: USER_NOT_FOUND
 */
router.patch("/users/:id/status", validateStatusChange, setStatus);

export default router;
