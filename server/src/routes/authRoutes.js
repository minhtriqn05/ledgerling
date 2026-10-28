import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { validateRegister, validateLogin } from "../middlewares/validateAuth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

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
 */
router.post("/login", validateLogin, login);

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

export default router;
