import { Router } from "express";
import authRoutes from "./authRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import statsRoutes from "./statsRoutes.js";
import budgetRoutes from "./budgetRoutes.js";
import tagRoutes from "./tagRoutes.js";
import recurringRoutes from "./recurringRoutes.js";
import goalRoutes from "./goalRoutes.js";
import reportRoutes from "./reportRoutes.js";
import insightRoutes from "./insightRoutes.js";
import templateRoutes from "./templateRoutes.js";
import walletRoutes from "./walletRoutes.js";
import transferRoutes from "./transferRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";
import adminRoutes from "./adminRoutes.js";
import { liveChanges } from "../middlewares/liveChanges.js";
import { apiIndex, health } from "../controllers/healthController.js";

const router = Router();

router.use("/auth", authRoutes);
// liveChanges: after a write that succeeded, the other devices of the user hear that this resource changed
router.use("/categories", liveChanges("categories"), categoryRoutes);
router.use("/transactions", liveChanges("transactions"), transactionRoutes);
router.use("/stats", statsRoutes);
router.use("/budgets", liveChanges("budgets"), budgetRoutes);
router.use("/tags", tagRoutes);
router.use("/recurring", liveChanges("recurring"), recurringRoutes);
router.use("/goals", liveChanges("goals"), goalRoutes);
router.use("/reports", reportRoutes);
router.use("/insights", insightRoutes);
router.use("/templates", liveChanges("templates"), templateRoutes);
router.use("/wallets", liveChanges("wallets"), walletRoutes);
// A transfer only changes wallet balances, so the other devices hear "wallets"
router.use("/transfers", liveChanges("wallets"), transferRoutes);
router.use("/notifications", liveChanges("notifications"), notificationRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check that the API is running, and which build answers
 *     description: |
 *       `version` is the Git commit Render deployed (`RENDER_GIT_COMMIT`), or the time this server started when it runs
 *       outside Render. Never rate-limited.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *             example:
 *               success: true
 *               data:
 *                 version: 1ca2479a1b2c3d4e5f60718293a4b5c6d7e8f901
 */
router.get("/health", health);

/**
 * @openapi
 * /:
 *   get:
 *     summary: The front page of the API, with links to the docs, the health check and the code
 *     description: |
 *       What a browser shows at the base URL. No token needed. `version` is the same as in `/health`; `app` is the first
 *       address of `CLIENT_URL`.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The API answers
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
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     version:
 *                       type: string
 *                     docs:
 *                       type: string
 *                     health:
 *                       type: string
 *                     app:
 *                       type: string
 *                       nullable: true
 *                     repository:
 *                       type: string
 *             example:
 *               success: true
 *               data:
 *                 name: Ledgerling API
 *                 description: REST API of Ledgerling, a personal expense tracker
 *                 version: c9110dee8ef5f0777cfb26b4ead729dbefc54437
 *                 docs: https://ledgerling-api.onrender.com/api-docs
 *                 health: https://ledgerling-api.onrender.com/api/health
 *                 app: https://ledgerling-ten.vercel.app
 *                 repository: https://github.com/minhtriqn05/ledgerling
 */
router.get("/", apiIndex);

export default router;
