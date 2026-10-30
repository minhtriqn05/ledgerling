import { Router } from "express";
import { list, create, getOne, update, remove } from "../controllers/templateController.js";
import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateTemplateId,
} from "../middlewares/validateTemplate.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every template route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /templates:
 *   get:
 *     summary: List my transaction templates (oldest first)
 *     description: A template is a saved category + amount + note. The quick add dialog shows them as chips; a click saves a transaction dated today.
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The templates of the signed-in user (an empty array when there are none)
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
 *                     $ref: '#/components/schemas/Template'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", list);

/**
 * @openapi
 * /templates:
 *   post:
 *     summary: Create a transaction template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateInput'
 *     responses:
 *       201:
 *         description: Template created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       400:
 *         description: Invalid input ("Name is required", "Name must be at most 40 characters", "Category id is invalid", "Amount must be greater than 0", "Note must be at most 200 characters")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Amount must be greater than 0
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Category not found (it does not exist or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Category not found
 */
router.post("/", validateCreateTemplate, create);

/**
 * @openapi
 * /templates/{id}:
 *   get:
 *     summary: Get one of my templates
 *     tags: [Templates]
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
 *         description: The template
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Template not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Template not found
 */
router.get("/:id", validateTemplateId, getOne);

/**
 * @openapi
 * /templates/{id}:
 *   patch:
 *     summary: Update a template (any of name, categoryId, amount, note)
 *     tags: [Templates]
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
 *                 maxLength: 40
 *                 example: Morning coffee
 *               categoryId:
 *                 type: string
 *                 example: 6720b1b2c3d4e5f601234568
 *               amount:
 *                 type: number
 *                 example: 35000
 *               note:
 *                 type: string
 *                 maxLength: 200
 *                 example: Coffee
 *     responses:
 *       200:
 *         description: The updated template
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       400:
 *         description: Invalid input ("Nothing to update", "Name is required", "Category id is invalid", "Amount must be greater than 0", ...)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Nothing to update
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Template or category not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Template not found
 */
router.patch("/:id", validateTemplateId, validateUpdateTemplate, update);

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     summary: Delete a template (transactions saved from it are kept)
 *     tags: [Templates]
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
 *                       example: 6720b1b2c3d4e5f601234700
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Template not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Template not found
 */
router.delete("/:id", validateTemplateId, remove);

export default router;
