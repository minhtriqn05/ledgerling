import { Router } from "express";
import { list, create } from "../controllers/categoryController.js";
import { validateCreateCategory, validateListCategories } from "../middlewares/validateCategory.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every category route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List my categories (sorted by type, then name)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *     responses:
 *       200:
 *         description: The categories of the signed-in user
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
 *                     $ref: '#/components/schemas/Category'
 *       400:
 *         description: Type must be income or expense
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
router.get("/", validateListCategories, list);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
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
 *                 example: Food
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: expense
 *               color:
 *                 type: string
 *                 example: "#FF7043"
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input ("Name is required", "Type must be income or expense", "Color must be a hex code like #FF7043")
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
 *       409:
 *         description: Category already exists (same name and type for this user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", validateCreateCategory, create);

export default router;
