// Fills the demo account (demo@example.com) with sample data.
//   cd server && npm run seed
// It connects to the database in server/.env (MONGODB_URI), so run it yourself on your own machine:
// that is the only way the demo account is made, and the landing page's "Try the demo" button needs it.
// Only the documents of the demo user are deleted and made again, so running it twice is safe.
// The password of the account is DEMO_PASSWORD in .env.
import "dotenv/config";
import mongoose from "mongoose";
import { seedDemo } from "./services/demoSeedService.js";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}
if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 6) {
  console.error("DEMO_PASSWORD is not set in .env (at least 6 characters)");
  process.exit(1);
}

let exitCode = 0;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Seeding the demo account in the database "${mongoose.connection.name}"...`);
  const summary = await seedDemo({ password: process.env.DEMO_PASSWORD });
  console.log("Done:", summary);
} catch (err) {
  console.error("Could not seed the demo account:", err.message);
  exitCode = 1;
} finally {
  await mongoose.disconnect();
}
process.exit(exitCode);
