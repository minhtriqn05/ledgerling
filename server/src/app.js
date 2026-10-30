import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Content-Disposition is exposed so the browser app can read the file name of a CSV export
app.use(cors({ origin: allowedOrigins, exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    // Keep the pasted token after a page reload
    swaggerOptions: { persistAuthorization: true },
  })
);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
