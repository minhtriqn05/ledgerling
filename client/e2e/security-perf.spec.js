import { test, expect } from '@playwright/test';

// Phase 20: pages are loaded when they are opened, and the API sends security headers.

const API_URL = 'http://localhost:4100/api';

// The charts library (Recharts) is large. The build puts it in a file whose name it chooses itself, so a script is
// recognised by its text: Recharts holds the class names it gives the charts, like "recharts-wrapper".
function watchChartLibrary(page) {
  const found = [];
  const reads = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    reads.push(
      response
        .text()
        .then((text) => text.includes('recharts-wrapper') && found.push(response.url()))
        .catch(() => {})
    );
  });
  // The URLs of the downloaded scripts that hold Recharts, once every answer so far has been read
  return async () => {
    await Promise.all(reads);
    return found;
  };
}

test('the Login page does not download the charts library, the Dashboard does', async ({ page }) => {
  const chartScripts = watchChartLibrary(page);

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await chartScripts()).toEqual([]);

  // Register: the Dashboard (with charts) opens, and only now its code is downloaded
  const email = `perf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Perf Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect((await chartScripts()).length).toBeGreaterThan(0);
});

test('pages opened by their address are downloaded on demand and show their content', async ({ page }, testInfo) => {
  const email = `perf-nav-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Perf Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Straight to another page by its address: its code is downloaded, then it shows
  await page.goto('/categories');
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
});

test('the API answers with security headers and without X-Powered-By', async ({ request }) => {
  const response = await request.get(`${API_URL}/health`);

  expect(response.status()).toBe(200);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['strict-transport-security']).toBeTruthy();
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(response.headers()['x-powered-by']).toBeUndefined();
});

test('the API refuses a login body with an operator (400) and a body over 100 kB (413)', async ({ request }) => {
  const injection = await request.post(`${API_URL}/auth/login`, { data: { email: { $ne: null }, password: { $ne: null } } });
  expect(injection.status()).toBe(400);
  expect((await injection.json()).success).toBe(false);

  const tooBig = await request.post(`${API_URL}/auth/login`, { data: { email: 'a@b.co', password: 'x'.repeat(150 * 1024) } });
  expect(tooBig.status()).toBe(413);
  expect((await tooBig.json()).code).toBe('PAYLOAD_TOO_LARGE');
});
