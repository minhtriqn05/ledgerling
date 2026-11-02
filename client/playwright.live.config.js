import { defineConfig, devices } from '@playwright/test';
import { LIVE_APP_URL } from './e2e/helpers/live.js';

// npm run test:e2e:live
// Checks the deployed site (Vercel + Render) instead of local servers: the API, its docs and the frontend answer, and the
// main flow works with one temporary account that is made through the public API and deleted at the end
// (DELETE /api/users/me). The live-smoke workflow runs it after every deploy of main. The tests are e2e/live/*.live.js,
// a name the normal `npm run test:e2e` never picks up.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.live.js',
  outputDir: './test-results',
  // The free Render server sleeps when nobody uses it: the first request can wait about a minute while it wakes up
  timeout: 180000,
  expect: { timeout: 30000 },
  // One test at a time, in the order of the file
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: LIVE_APP_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Like the other end-to-end tests, the browser starts as if it saw the guided tour already
    storageState: {
      cookies: [],
      origins: [{ origin: LIVE_APP_URL, localStorage: [{ name: 'ledgerling.tourSeen', value: '1' }] }],
    },
  },
  projects: [{ name: 'live', use: { ...devices['Desktop Chrome'] } }],
});
