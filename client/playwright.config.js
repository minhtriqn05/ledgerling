import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (npm run test:e2e). Playwright starts both servers itself:
// - the API on port 4100 with an in-memory database (npm run start:e2e in /server), never Atlas
// - the production build of the app (vite build, then vite preview on port 5174), so the tests run the code that is
//   deployed. A dev server would compile hundreds of modules on every first load and make long tests time out.
const API_URL = 'http://localhost:4100/api';
const APP_URL = 'http://localhost:5174';

// The guided tour opens for somebody who never saw it, over the whole page. Every test browser starts as if it saw the
// tour already, so a test can click on the page right after signing in. e2e/ux-polish.spec.js empties this for the tour itself.
const TOUR_SEEN = [{ name: 'ledgerling.tourSeen', value: '1' }];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 30000,
  expect: { timeout: 10000 },
  // On the CI a forgotten test.only fails the run instead of quietly skipping every other test
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The build registers a service worker that keeps API answers for offline use. Only e2e/offline.spec.js is about
    // it; everywhere else it is blocked, so every test reads the API itself.
    serviceWorkers: 'block',
    storageState: {
      cookies: [],
      origins: [{ origin: APP_URL, localStorage: TOUR_SEEN }],
    },
  },
  // Every test runs on Chrome, on a desktop and on a phone screen. The main flow of each feature is tagged @smoke
  // (test('...', { tag: '@smoke' }, ...)); those also run on Firefox and on Safari of an iPhone.
  // npm run test:e2e:chromium runs the first two projects, npm run test:e2e:smoke the last two, npm run test:e2e both
  // parts one after the other (like the two CI jobs).
  // Firefox and WebKit need much more processor than Chrome: one test at a time each, or the long tests take three
  // times as long on a laptop and run out of time.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/, workers: 1 },
    // Playwright's WebKit draws without the GPU: the endless background animations (three lights blurred by 64px, the
    // logo coin) cost about 0.6 s per frame there, so every click waits for the page to hold still. With reduced
    // motion, which the app follows, a frame takes 16 ms. A real iPhone moves those layers on its GPU.
    // The iPhone's 3 device pixels per CSS pixel make every frame 9 times bigger to draw: on the 4 processors of the CI
    // one click waited up to 7 s for the page to hold still, and the admin test ran out of its 30 s (F-041). The iPhone
    // screen, touch and browser stay; only the drawing is at 1 device pixel (measured on Linux with 1.5 processors:
    // 10.4 s of waiting in that test at 3 pixels, 3.0 s at 1).
    { name: 'webkit', use: { ...devices['iPhone 14'], deviceScaleFactor: 1, reducedMotion: 'reduce' }, grep: /@smoke/, workers: 1 },
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
      // Built into its own folder, so it never replaces the dist/ of `npm run build`
      command: 'npm run build -- --outDir dist-e2e && npm run preview -- --outDir dist-e2e --port 5174 --strictPort',
      url: APP_URL,
      timeout: 120000,
      reuseExistingServer: false,
      // Passed through the env option (not "VAR=value npm run build") so it also works on Windows.
      // A variable that is already set wins over client/.env in Vite.
      env: { VITE_API_URL: API_URL },
    },
  ],
});
