import { Router } from "express";
import { register, login, demo, me, logoutAll } from "../controllers/authController.js";
import { validateRegister, validateLogin } from "../middlewares/validateAuth.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { blockDemo } from "../middlewares/blockDemo.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create an account and get a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *                 example: Minh Tri
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tri@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 72
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input ("Name is required", "Name must be at most 50 characters", "Email is invalid", "Password must be at least 6 characters", "Password must be at most 72 characters")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Password must be at least 6 characters
 *       409:
 *         description: Email is already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Email is already registered
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/register", validateRegister, register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and get a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: tri@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input ("Email is invalid", "Password is required")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Wrong email or password (the same message for an unknown email and a wrong password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid email or password
 *       403:
 *         description: The password is right but an admin disabled the account (code ACCOUNT_DISABLED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Account disabled
 *               code: ACCOUNT_DISABLED
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/login", validateLogin, login);

/**
 * @openapi
 * /auth/demo:
 *   post:
 *     summary: Sign in to the demo account
 *     description: One click for the "Try the demo" button. Returns a token for the shared demo account (demo@example.com, full of sample data made by `npm run seed`). No body is needed. The demo account cannot change its password, log out of all devices or be deleted (403 DEMO_READ_ONLY). It shares the login rate limit.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Signed in as the demo user (user.isDemo is true)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       503:
 *         description: The demo account has not been seeded on this server (code DEMO_UNAVAILABLE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Demo account is not available
 *               code: DEMO_UNAVAILABLE
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post("/demo", demo);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user that owns the token (no password hash)
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
 *       401:
 *         description: Token missing, invalid or expired, or the account no longer exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Not authorized, invalid token
 */
router.get("/me", requireAuth, me);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Log out of all devices
 *     description: Raises the token version, so every token made before (on every device, this one included) stops working. The answer holds a new token for the device that asked, which stays signed in. The app uses it for "Log out of all other devices".
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Every other device is logged out. Use the new token from now on.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/DemoReadOnly'
 */
router.post("/logout-all", requireAuth, blockDemo, logoutAll);

export default router;
