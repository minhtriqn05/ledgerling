import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check that the API is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The API is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.get("/health", (req, res) => {
  res.status(200).json({ success: true });
});

export default router;
