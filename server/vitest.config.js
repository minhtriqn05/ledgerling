import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Starts and stops an in-memory MongoDB around each test file
    setupFiles: ["tests/setup.js"],
    // One file at a time: each file has its own in-memory database, and a laptop has limited memory
    fileParallelism: false,
    // The first run downloads the MongoDB binary, which can take a while
    hookTimeout: 120000,
    testTimeout: 20000,
    // npm run test:coverage: which lines of src/ the tests run (report in coverage/, not committed)
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text-summary", "json-summary", "html"],
      // npm run test:coverage fails below these (the CI runs it)
      thresholds: { lines: 80, branches: 80 },
    },
    // Tests never read .env, so they can never reach the Atlas database
    env: {
      // src/app.js turns the rate limits off when NODE_ENV is "test"
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "1h",
    },
  },
});
