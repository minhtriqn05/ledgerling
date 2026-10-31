import { Router } from "express";
import { updatePreferences } from "../controllers/userController.js";
import { validatePreferences } from "../middlewares/validateUser.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every user route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /users/me/preferences:
 *   patch:
 *     summary: Change my preferences (for now, which kinds of notifications I get)
 *     description: Only the switches in the body change, the others keep their value. A switch that is off means that kind of notification is never created.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notifications]
 *             properties:
 *               notifications:
 *                 type: object
 *                 description: At least one of the four switches
 *                 properties:
 *                   budget:
 *                     type: boolean
 *                     description: Budget warnings (80%) and over-budget alerts (100%)
 *                   goals:
 *                     type: boolean
 *                     description: A savings goal was reached
 *                   recurring:
 *                     type: boolean
 *                     description: Recurring transactions were added
 *                   weekly:
 *                     type: boolean
 *                     description: The weekly summary
 *                 example: { budget: false }
 *     responses:
 *       200:
 *         description: The user with the new preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 'Invalid input ("Nothing to update", "Only notifications can be changed", "Notifications must be an object", "Notifications can only have budget, goals, recurring, weekly", "Notification setting ... must be true or false")'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Notification setting "budget" must be true or false
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/me/preferences", validatePreferences, updatePreferences);

export default router;
