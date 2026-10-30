import { Router } from "express";
import authRoutes from "./authRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import statsRoutes from "./statsRoutes.js";
import budgetRoutes from "./budgetRoutes.js";
import tagRoutes from "./tagRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/transactions", transactionRoutes);
router.use("/stats", statsRoutes);
router.use("/budgets", budgetRoutes);
router.use("/tags", tagRoutes);

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
 *             example:
 *               success: true
 */
router.get("/health", (req, res) => {
  res.status(200).json({ success: true });
});

export default router;
