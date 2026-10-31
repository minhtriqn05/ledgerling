// Gives an existing account the admin role.
//   cd server && npm run make-admin -- tri@example.com
// It connects to the database in server/.env (MONGODB_URI), so run it yourself on your own machine:
// it is the only way to create an admin, because no API route can change a role.
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const email = (process.argv[2] ?? "").trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}

let exitCode = 0;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const user = await User.findOneAndUpdate({ email }, { $set: { role: "admin" } }, { returnDocument: "after" });
  if (user) {
    console.log(`${user.email} is now an admin (database: ${mongoose.connection.name}). Log in again to see the Admin page.`);
  } else {
    console.error(`No account with the email ${email} (database: ${mongoose.connection.name}). Register it first.`);
    exitCode = 1;
  }
} catch (err) {
  console.error("Could not make the admin:", err.message);
  exitCode = 1;
} finally {
  await mongoose.disconnect();
}
process.exit(exitCode);
