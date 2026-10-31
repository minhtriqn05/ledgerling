import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (npm run test:e2e). Playwright starts both servers itself:
// - the API on port 4100 with an in-memory database (npm run start:e2e in /server), never Atlas
// - Vite on port 5174, so it never clashes with a normal `npm run dev` on 5173
// - the production build on port 5175 (vite preview, in its own folder): the service worker only exists there (e2e/offline.spec.js)
const API_URL = 'http://localhost:4100/api';
const APP_URL = 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Every test runs on a desktop and on a phone screen
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run start:e2e',
      cwd: '../server',
      url: `${API_URL}/health`,
      // The first run downloads the MongoDB binary
      timeout: 180000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: APP_URL,
      timeout: 60000,
      reuseExistingServer: false,
      // Passed through the env option (not "VAR=value npm run dev") so it also works on Windows.
      // A variable that is already set wins over client/.env in Vite.
      env: { VITE_API_URL: API_URL },
    },
    {
      command: 'npm run build -- --outDir dist-e2e && npm run preview -- --outDir dist-e2e --port 5175 --strictPort',
      url: 'http://localhost:5175',
      timeout: 120000,
      reuseExistingServer: false,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
