import { Router } from "express";
import { list, create, getOne, update, remove } from "../controllers/categoryController.js";
import {
  validateCreateCategory,
  validateListCategories,
  validateUpdateCategory,
  validateCategoryId,
} from "../middlewares/validateCategory.js";
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
 *             example:
 *               success: false
 *               message: Type must be income or expense
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
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
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
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
 *         description: Invalid input ("Name is required", "Name must be at most 30 characters", "Type must be income or expense", "Color must be a hex code like #FF7043")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Color must be a hex code like #FF7043
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Category already exists (same name and type for this user, case-insensitive)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category already exists
 */
router.post("/", validateCreateCategory, create);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get one of my categories
 *     tags: [Categories]
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
 *         description: The category
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 */
router.get("/:id", validateCategoryId, getOne);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     summary: Update the name and/or color of a category (type cannot be changed)
 *     tags: [Categories]
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
 *                 example: Eating out
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: "#E53935"
 *     responses:
 *       200:
 *         description: The updated category
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
 *         description: Invalid input ("Nothing to update", "Type cannot be changed", "Name is required", "Name must be at most 30 characters", "Color must be a hex code like #FF7043")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Type cannot be changed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *       409:
 *         description: Category already exists (same name and type for this user, case-insensitive)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category already exists
 */
router.patch("/:id", validateCategoryId, validateUpdateCategory, update);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category (409 if transactions still use it)
 *     description: The budgets of the category (every month) are deleted together with it.
 *     tags: [Categories]
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
 *         description: Deleted together with its budgets, returns the id
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
 *                       example: 6720b1b2c3d4e5f601234568
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 *       409:
 *         description: The category is still used by at least one transaction. Move or delete those transactions first.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category still has transactions
 */
router.delete("/:id", validateCategoryId, remove);

export default router;
