import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.js';

// npm run screenshots
// Takes the pictures of the landing page (src/assets/screenshots/*.jpg) from the demo account, on the same API with an
// in-memory database that the end-to-end tests use (never Atlas). Run it again when the app looks different.
// The file is named *.capture.js, so the normal `npm run test:e2e` never runs it.
export default defineConfig({
  ...base,
  testMatch: '**/*.capture.js',
  reporter: [['list']],
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
