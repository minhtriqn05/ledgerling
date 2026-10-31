import { Router } from "express";
import {
  updateProfile,
  changePassword,
  updatePreferences,
  exportData,
  deleteAccount,
} from "../controllers/userController.js";
import {
  validateProfile,
  validatePasswordChange,
  validatePreferences,
  validateDeleteAccount,
} from "../middlewares/validateUser.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { blockDemo } from "../middlewares/blockDemo.js";

const router = Router();

// Every user route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Change my name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *                 example: Minh Tri
 *     responses:
 *       200:
 *         description: The user with the new name
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
 *         description: Invalid input ("Name is required", "Name must be at most 50 characters")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Name is required
 *               code: NAME_REQUIRED
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Delete my account and everything in it
 *     description: Deletes the user and every category, transaction, budget, recurring rule, goal, template and notification that belongs to the user. It cannot be undone. The password is sent again to confirm; a wrong password is a 400 (not a 401, because the client logs out on every 401).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: The account is gone
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
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: 'The password is missing ("Password is required", PASSWORD_REQUIRED) or wrong ("Password is incorrect", WRONG_PASSWORD)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Password is incorrect
 *               code: WRONG_PASSWORD
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/DemoReadOnly'
 */
router.patch("/me", validateProfile, updateProfile);
router.delete("/me", blockDemo, validateDeleteAccount, deleteAccount);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     summary: Change my password
 *     description: Every other device is logged out (the token version goes up) and this device gets a new token in the answer, so it stays signed in. A wrong current password is a 400 (not a 401, because the client logs out on every 401).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: secret123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *                 description: At least 8 characters and different from the current password
 *                 example: a-better-secret
 *     responses:
 *       200:
 *         description: Password changed. Use the new token from now on.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 'Invalid input (CURRENT_PASSWORD_REQUIRED, NEW_PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, PASSWORD_UNCHANGED) or the current password is wrong (WRONG_PASSWORD)'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Current password is incorrect
 *               code: WRONG_PASSWORD
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/DemoReadOnly'
 */
router.patch("/me/password", blockDemo, validatePasswordChange, changePassword);

/**
 * @openapi
 * /users/me/preferences:
 *   patch:
 *     summary: Change my preferences (theme, first day of the week, language, notifications)
 *     description: Only the fields in the body change, the others keep their value. At least one field is needed. A notification switch that is off means that kind of notification is never created.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *                 description: system follows the device
 *               weekStartsOn:
 *                 type: string
 *                 enum: [monday, sunday]
 *                 description: The first column of the calendar in Reports
 *               language:
 *                 type: string
 *                 enum: [en, vi, fr, de, es, zh-CN, ja, ko]
 *                 description: The app opens in this language on every device
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
 *             example: { theme: dark, weekStartsOn: sunday }
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
 *         description: 'Invalid input ("Nothing to update", "Only notifications, theme, weekStartsOn, language can be changed", "Theme must be one of light, dark, system", "weekStartsOn must be one of monday, sunday", "Language must be one of ...", "Notifications must be an object", "Notification setting ... must be true or false")'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Theme must be one of light, dark, system
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/me/preferences", validatePreferences, updatePreferences);

/**
 * @openapi
 * /users/me/export:
 *   get:
 *     summary: Download all my data
 *     description: One JSON document with the profile (never the password hash) and everything the user owns. The app saves `data` as a .json file.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The data of the user
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
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *                     profile:
 *                       $ref: '#/components/schemas/User'
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     budgets:
 *                       type: array
 *                       items:
 *                         type: object
 *                     recurringRules:
 *                       type: array
 *                       items:
 *                         type: object
 *                     goals:
 *                       type: array
 *                       items:
 *                         type: object
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me/export", exportData);

export default router;
