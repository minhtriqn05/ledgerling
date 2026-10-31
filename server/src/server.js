import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { attachSocket } from "./services/realtimeService.js";
import User from "./models/User.js";
import { DEMO_EMAIL } from "./utils/demo.js";

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

  // The "Try the demo" button answers 503 until `npm run seed` has made the demo account in this database.
  // A reminder in the log (Render > Logs) is easier to find than a button that does not work.
  try {
    if (!(await User.exists({ email: DEMO_EMAIL }))) {
      console.warn(`The demo account (${DEMO_EMAIL}) is not in this database: "Try the demo" will answer 503. Run "npm run seed" (see README).`);
    }
  } catch (err) {
    console.warn("Could not check the demo account:", err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  // The real-time events share the port of the API
  attachSocket(server);
}

start();
