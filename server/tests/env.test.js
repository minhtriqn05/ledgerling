import { describe, expect, it } from "vitest";
import { envProblems } from "../src/config/env.js";
import { allowedOrigins } from "../src/config/origins.js";

const GOOD = {
  MONGODB_URI: "mongodb+srv://user:pass@cluster.example.net/ledgerling",
  JWT_SECRET: "a-long-random-secret",
  JWT_EXPIRES_IN: "7d",
  CLIENT_URL: "https://ledgerling-ten.vercel.app",
};

describe("environment check at start-up", () => {
  it("is happy with every variable set, and JWT_EXPIRES_IN may be left out (7d)", () => {
    expect(envProblems(GOOD)).toEqual([]);
    expect(envProblems({ ...GOOD, JWT_EXPIRES_IN: undefined })).toEqual([]);
  });

  it("names every missing variable the server cannot work without", () => {
    expect(envProblems({})).toEqual([
      "MONGODB_URI is not set",
      "JWT_SECRET is not set",
      "CLIENT_URL is not set (the address of the web app, e.g. https://ledgerling-ten.vercel.app)",
    ]);
  });

  it("refuses a JWT_EXPIRES_IN that would make every login fail", () => {
    expect(envProblems({ ...GOOD, JWT_EXPIRES_IN: "seven days" })).toEqual([
      'JWT_EXPIRES_IN "seven days" is not a valid duration (use e.g. 7d, 12h or 3600)',
    ]);
  });
});

describe("allowed origins", () => {
  it("reads CLIENT_URL as a comma-separated list and ignores spaces and a trailing slash", () => {
    const previous = process.env.CLIENT_URL;
    process.env.CLIENT_URL = " https://ledgerling-ten.vercel.app/ ,http://localhost:5173,, ";
    try {
      expect(allowedOrigins()).toEqual(["https://ledgerling-ten.vercel.app", "http://localhost:5173"]);
    } finally {
      process.env.CLIENT_URL = previous;
    }
  });
});
