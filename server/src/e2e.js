// Starts the API for the Playwright tests (npm run start:e2e).
// It uses an empty MongoDB in memory instead of Atlas and never reads .env,
// so end-to-end tests can never touch the real database.
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = 4100;

process.env.JWT_SECRET = "e2e-secret";
process.env.JWT_EXPIRES_IN = "1h";
// The Vite dev server that Playwright opens
process.env.CLIENT_URL = "http://localhost:5174";

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());

// app.js reads CLIENT_URL when it is loaded, so it is imported after the variables above are set
const { default: app } = await import("./app.js");

const server = app.listen(PORT, () => {
  console.log(`E2E API running on http://localhost:${PORT} (in-memory database)`);
});

// Playwright stops this process when the tests end; close the database with it
async function shutdown() {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
