import mongoose from "mongoose";

// Mongoose builds the indexes of every model in the background once it is connected. An index it cannot build (for
// example a unique index over duplicates already in the database) does not stop the server; the log names it.
export function logIndexErrors(models = Object.values(mongoose.models)) {
  for (const model of models) {
    model.on("index", (err) => {
      if (err) console.error(`Index of ${model.modelName} could not be built:`, err.message);
    });
  }
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env");
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
  });
  // The models exist already (server.js imports the app first); their indexes are built after the connection
  logIndexErrors();

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
