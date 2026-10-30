import { afterAll, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Every test file gets its own empty database in memory, so files never see each other's data
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build the unique indexes now, so a duplicate is refused by the database from the first test
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
