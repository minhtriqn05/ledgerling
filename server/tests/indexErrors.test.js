import { afterEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { logIndexErrors } from "../src/config/db.js";

// Mongoose builds the indexes of the models in the background. One it cannot build (for example a unique index over
// duplicates that are already in the database) must not stop the server, and the log must say which.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("an index that cannot be built", () => {
  it("is named in the log, and the model keeps working", async () => {
    await mongoose.connection.db.collection("duplicates").insertMany([{ code: "a" }, { code: "a" }]);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const Duplicate = mongoose.model("Duplicate", new mongoose.Schema({ code: { type: String, unique: true } }), "duplicates");
    logIndexErrors([Duplicate]);
    await expect(Duplicate.init()).rejects.toThrow(/duplicate key/);

    expect(errorLog).toHaveBeenCalledWith("Index of Duplicate could not be built:", expect.stringContaining("duplicate key"));
    expect(await Duplicate.countDocuments()).toBe(2);
  });

  it("logs nothing when the indexes are built", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const Fine = mongoose.model("Fine", new mongoose.Schema({ code: { type: String, unique: true } }), "fines");
    logIndexErrors([Fine]);
    await Fine.init();
    expect(errorLog).not.toHaveBeenCalled();
  });
});
