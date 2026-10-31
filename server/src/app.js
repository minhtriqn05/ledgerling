import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { allowedOrigins } from "./config/origins.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { apiLimiter, authLimiter } from "./middlewares/rateLimit.js";
import { rejectOperators } from "./middlewares/sanitizeInput.js";

// The one route that may send more than 100 kB: a CSV import of 500 rows with long notes
const IMPORT_PATH = "/api/transactions/import";
const defaultJson = express.json({ limit: "100kb" });
const importJson = express.json({ limit: "300kb" });

// Rate limits are on, except in the tests (they send hundreds of requests from one address) and when
// RATE_LIMIT_OFF=true (the end-to-end API, same reason). tests/security.test.js turns them on with createApp({ rateLimit: true }).
function rateLimitWanted() {
  return process.env.NODE_ENV !== "test" && process.env.RATE_LIMIT_OFF !== "true";
}

// Makes a new Express app. server.js uses the default export; a test can make its own, with its own rate limit counters.
export function createApp({ rateLimit = rateLimitWanted() } = {}) {
  const app = express();

  // Render puts one proxy in front of the server. Without this, every request would look like it comes from the
  // proxy and all users would share one rate limit.
  app.set("trust proxy", 1);
  // Query strings stay flat: ?a[b]=c is not turned into an object
  app.set("query parser", "simple");

  // Security headers on every route (also /api-docs). The API is read by the app on another address (Vercel),
  // so its answers must be allowed to be used by other origins.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // Smaller JSON answers (and CSV exports)
  app.use(compression());
  // Content-Disposition is exposed so the browser app can read the file name of a CSV export
  app.use(cors({ origin: allowedOrigins(), exposedHeaders: ["Content-Disposition"] }));

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      // Keep the pasted token after a page reload
      swaggerOptions: { persistAuthorization: true },
    })
  );

  // Before the body is read, so a flood of big requests is also counted
  if (rateLimit) {
    app.use("/api", apiLimiter());
    app.use("/api/auth/login", authLimiter());
    app.use("/api/auth/register", authLimiter());
    app.use("/api/auth/demo", authLimiter());
  }
  app.use((req, res, next) => (req.path === IMPORT_PATH ? importJson : defaultJson)(req, res, next));
  app.use("/api", rejectOperators);
  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp();
