// Starts the API for the Playwright tests (npm run start:e2e).
// It uses an empty MongoDB in memory instead of Atlas and never reads .env,
// so end-to-end tests can never touch the real database.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = 4100;

process.env.JWT_SECRET = "e2e-secret";
process.env.JWT_EXPIRES_IN = "1h";
// The Vite dev server that Playwright opens, and the preview of the build (offline tests)
process.env.CLIENT_URL = "http://localhost:5174,http://localhost:5175";
// The tests make hundreds of requests from one address, so the rate limits (src/app.js) are off
process.env.RATE_LIMIT_OFF = "true";

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());

// The one admin of the test database, for e2e/admin.spec.js. It exists only here: no route can create an admin.
const { default: User } = await import("./models/User.js");
const { createDefaultCategories } = await import("./services/categoryService.js");
const admin = await User.create({
  name: "E2E Admin",
  email: "admin@e2e.test",
  passwordHash: await bcrypt.hash("secret123", 10),
  role: "admin",
});
await createDefaultCategories(admin._id);

// The demo account of the "Try the demo" button, with the same sample data `npm run seed` makes on Atlas.
// The landing page screenshots (e2e/screenshots.spec.js) are taken from it.
const { seedDemo } = await import("./services/demoSeedService.js");
await seedDemo({ password: "demo-e2e-secret" });

// app.js reads CLIENT_URL when it is loaded, so it is imported after the variables above are set
const { default: app } = await import("./app.js");
const { attachSocket } = await import("./services/realtimeService.js");

const server = app.listen(PORT, () => {
  console.log(`E2E API running on http://localhost:${PORT} (in-memory database)`);
});
attachSocket(server);

// Playwright stops this process when the tests end; close the database with it
async function shutdown() {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
