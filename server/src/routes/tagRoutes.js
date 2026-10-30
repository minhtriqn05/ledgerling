import { Router } from "express";
import { list } from "../controllers/tagController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /tags:
 *   get:
 *     summary: List the tags I have used, with how many transactions carry each
 *     description: Used for the tag suggestions in the transaction form. Sorted by count (most used first), then A to Z.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The tags of the signed-in user (an empty array when none were used)
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
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: string
 *                         example: work
 *                       count:
 *                         type: integer
 *                         example: 12
 *             example:
 *               success: true
 *               data:
 *                 - { tag: work, count: 12 }
 *                 - { tag: trip, count: 3 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", list);

export default router;
