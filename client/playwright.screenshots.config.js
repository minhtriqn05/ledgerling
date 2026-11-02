import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.js';

// npm run screenshots: the pictures of the landing page (src/assets/screenshots/*.jpg, e2e/screenshots.capture.js).
// npm run screenshots:docs: the pictures of the README (docs/screenshots/*.jpg, e2e/docs-screenshots.capture.js).
// Both come from the demo account, on the same API with an in-memory database that the end-to-end tests use (never
// Atlas). Run them again when the app looks different. The files are named *.capture.js, so `npm run test:e2e` never
// runs them.
export default defineConfig({
  ...base,
  testMatch: '**/*.capture.js',
  reporter: [['list']],
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
