import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 4000;

async function start() {
  // Tokens cannot be signed or checked without a secret, so do not start at all
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set in .env");
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
