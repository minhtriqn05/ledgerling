import { Router } from "express";
import { list, unreadCount, markRead, markAllRead, remove } from "../controllers/notificationController.js";
import { validateListNotifications, validateNotificationId } from "../middlewares/validateNotification.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every notification route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List my notifications, newest first
 *     description: |
 *       First creates this week's summary if there is none in the last 7 days and the user has at least one transaction
 *       (and the "weekly" switch is on). There is no cron job, so listing is the moment the week is checked.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         required: false
 *         description: "true = only the unread ones"
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           default: "false"
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
 *           default: 20
 *     responses:
 *       200:
 *         description: |
 *           One page of notifications and meta about the pages.
 *           Example request - the 5 newest unread notifications:
 *           GET /api/notifications?unread=true&limit=5
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
 *                     $ref: '#/components/schemas/Notification'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 6720f1b2c3d4e5f601234701
 *                   type: budget_warning
 *                   title: "Budget warning: Food"
 *                   message: Food has used 85% of its 2026-10 budget (850,000 VND of 1,000,000 VND).
 *                   link: /budgets?month=2026-10
 *                   params: { categoryName: Food, month: "2026-10", percent: 85, spent: 850000, amount: 1000000 }
 *                   read: false
 *                   createdAt: "2026-10-31T03:00:00.000Z"
 *                   updatedAt: "2026-10-31T03:00:00.000Z"
 *               meta: { page: 1, limit: 5, total: 1, totalPages: 1 }
 *       400:
 *         description: 'Invalid query: "Page must be a whole number from 1", "Limit must be a whole number from 1 to 50", "Unread must be true or false"'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Unread must be true or false
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", validateListNotifications, list);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: How many notifications I have not read yet
 *     description: Cheap on purpose, the app asks for it every minute. It never creates a notification.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The number of unread notifications
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
 *                     count:
 *                       type: integer
 *                       example: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/unread-count", unreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all my notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: How many notifications were changed (the ones that were unread)
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
 *                     updated:
 *                       type: integer
 *                       example: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/read-all", markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
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
 *         description: The notification, now read (also when it was already read)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Notification not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Notification not found
 *               code: NOTIFICATION_NOT_FOUND
 */
router.patch("/:id/read", validateNotificationId, markRead);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
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
 *                       example: 6720f1b2c3d4e5f601234701
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Notification not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Notification not found
 *               code: NOTIFICATION_NOT_FOUND
 */
router.delete("/:id", validateNotificationId, remove);

export default router;
