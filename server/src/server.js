import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { envProblems } from "./config/env.js";
import { attachSocket, closeSocket } from "./services/realtimeService.js";
import User from "./models/User.js";
import { DEMO_EMAIL } from "./utils/demo.js";

const PORT = process.env.PORT || 4000;

async function start() {
  // A variable the server cannot work without stops it at once, with its name (Render > Logs shows the message)
  const problems = envProblems(process.env);
  if (problems.length > 0) {
    console.error(`The server cannot start:\n- ${problems.join("\n- ")}\nSet them in server/.env (see .env.example) or in Render > Environment.`);
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

  // Render sends SIGTERM before it replaces this server with a new deploy. Closing Socket.IO also closes the HTTP
  // server, which waits for the requests on their way; then the database connection ends.
  async function shutdown() {
    await closeSocket();
    await mongoose.disconnect();
    process.exit(0);
  }
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

start();
