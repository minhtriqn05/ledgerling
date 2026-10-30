import { Router } from "express";
import {
  list,
  getOne,
  create,
  update,
  remove,
  addContribution,
  removeContribution,
} from "../controllers/goalController.js";
import {
  validateGoalCreate,
  validateGoalUpdate,
  validateContribution,
  validateGoalId,
  validateContributionId,
} from "../middlewares/validateGoal.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Every goal route needs a valid token
router.use(requireAuth);

/**
 * @openapi
 * /goals:
 *   get:
 *     summary: List my savings goals
 *     description: |
 *       Goals still to reach come first, the nearest deadline first (goals without a deadline after them).
 *       Completed goals come last. The list does not include the contribution history: use GET /goals/{id} for it.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The goals of the signed-in user
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
 *                     $ref: '#/components/schemas/Goal'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", list);

/**
 * @openapi
 * /goals:
 *   post:
 *     summary: Create a savings goal
 *     description: A new goal starts with savedAmount 0. Money is added with POST /goals/{id}/contributions.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoalInput'
 *     responses:
 *       201:
 *         description: Goal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Invalid input ("Name is required", "Name must be at most 60 characters", "Target amount must be a whole number greater than 0", "Deadline must be a date in YYYY-MM-DD format", "Deadline must be after today", "Color must be a hex code like #FF7043")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Deadline must be after today
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", validateGoalCreate, create);

/**
 * @openapi
 * /goals/{id}:
 *   get:
 *     summary: Get one goal with its contribution history
 *     description: The contributions are sorted newest first.
 *     tags: [Goals]
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
 *         description: The goal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Goal not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Goal not found
 */
router.get("/:id", validateGoalId, getOne);

/**
 * @openapi
 * /goals/{id}:
 *   put:
 *     summary: Replace a goal
 *     description: |
 *       Send name, targetAmount and color; a missing deadline removes the deadline. savedAmount and the contribution
 *       history are not changed. Unlike when a goal is created, the deadline may be in the past.
 *     tags: [Goals]
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
 *             $ref: '#/components/schemas/GoalInput'
 *     responses:
 *       200:
 *         description: The updated goal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Invalid input (same messages as POST /goals, except the deadline may be in the past)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Name is required
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Goal not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Goal not found
 */
router.put("/:id", validateGoalId, validateGoalUpdate, update);

/**
 * @openapi
 * /goals/{id}:
 *   delete:
 *     summary: Delete a goal and its history
 *     tags: [Goals]
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
 *         description: Goal not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Goal not found
 */
router.delete("/:id", validateGoalId, remove);

/**
 * @openapi
 * /goals/{id}/contributions:
 *   post:
 *     summary: Add money to a goal or withdraw money from it
 *     description: |
 *       A positive amount adds money, a negative amount withdraws it. savedAmount changes with one atomic update
 *       ($inc with a condition), so requests sent at the same moment always add up correctly and savedAmount never
 *       goes below 0. The date is a day in Vietnam time; a missing date means today.
 *     tags: [Goals]
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
 *             $ref: '#/components/schemas/ContributionInput'
 *     responses:
 *       201:
 *         description: The goal with its new savedAmount and history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Invalid input ("Amount must be a whole number other than 0", "Note must be a string", "Note must be at most 200 characters", "Date must be a date in YYYY-MM-DD format") or a withdrawal bigger than savedAmount ("You cannot withdraw more than the saved amount")
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: You cannot withdraw more than the saved amount
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Goal not found (the id does not exist, is malformed, or belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Goal not found
 */
router.post("/:id/contributions", validateGoalId, validateContribution, addContribution);

/**
 * @openapi
 * /goals/{id}/contributions/{contributionId}:
 *   delete:
 *     summary: Delete a contribution entered by mistake
 *     description: |
 *       Takes the contribution back: deleting a deposit lowers savedAmount, deleting a withdrawal raises it.
 *       A deposit cannot be deleted if the money was already withdrawn, because savedAmount would go below 0.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contributionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The goal with its new savedAmount and history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Deleting this deposit would make the saved amount negative
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Deleting this deposit would make the saved amount negative
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Goal or contribution not found (the id does not exist, is malformed, or the goal belongs to another user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Contribution not found
 */
router.delete("/:id/contributions/:contributionId", validateGoalId, validateContributionId, removeContribution);

export default router;
