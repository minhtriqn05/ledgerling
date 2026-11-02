import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { LIVE_API_URL, LIVE_APP_URL } from '../helpers/live.js';

// npm run test:e2e:live (playwright.live.config.js): the deployed site. Read-only checks first, then the main flow with
// one temporary account that is deleted at the end, whatever happens in between.

// The headers vercel.json gives every page
const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const pageHeaders = vercelConfig.headers.find((rule) => rule.source === '/(.*)').headers;

test('the API answers its health check with the deployed version, and serves its docs', async ({ request }) => {
  const health = await request.get(`${LIVE_API_URL}/health`);
  expect(health.status()).toBe(200);
  const { success, data } = await health.json();
  expect(success).toBe(true);
  expect(data.version).toBeTruthy();

  const docs = await request.get(`${LIVE_API_URL.replace(/\/api$/, '')}/api-docs`);
  expect(docs.status()).toBe(200);
  expect(await docs.text()).toContain('swagger-ui');
});

test('the frontend answers 200 on every address, also one typed by hand', async ({ request }) => {
  for (const path of ['/', '/welcome', '/login', '/transactions', '/settings/profile']) {
    const response = await request.get(`${LIVE_APP_URL}${path}`);
    expect(response.status(), path).toBe(200);
    expect(await response.text(), path).toContain('<div id="root">');
  }
});

test('the frontend sends the security headers of vercel.json', async ({ request }) => {
  const headers = (await request.get(`${LIVE_APP_URL}/welcome`)).headers();
  for (const { key, value } of pageHeaders) {
    expect(headers[key.toLowerCase()], key).toBe(value);
  }
});

test('the demo account is ready', async ({ request }) => {
  // Only signs in, which reads the account: the demo data is not changed
  const response = await request.post(`${LIVE_API_URL}/auth/demo`);
  expect(response.status()).toBe(200);
});

test('the rate limit counts the requests of one visitor one by one, whatever X-Forwarded-For says', async ({ playwright }) => {
  // The server finds the visitor behind Cloudflare and Render (CF-Connecting-IP in server/src/middlewares/rateLimit.js,
  // "trust proxy" in server/src/app.js). Each request opens its own connection, which can reach Render through other
  // Cloudflare and Render addresses: with a wrong setting the counter would follow those addresses and jump (F-001,
  // F-040), or follow an address the visitor writes and start again. (A computer that switches between IPv4 and IPv6
  // is two visitors; the GitHub runners of the live-smoke workflow only have IPv4.)
  async function remaining(headers) {
    const context = await playwright.request.newContext();
    try {
      const response = await context.get(`${LIVE_API_URL}/categories`, { headers });
      expect(response.status()).toBe(401);
      return Number(response.headers()['ratelimit-remaining']);
    } finally {
      await context.dispose();
    }
  }
  const first = await remaining();
  expect(first).toBeGreaterThan(10);
  for (let step = 1; step <= 6; step += 1) expect(await remaining()).toBe(first - step);
  expect(await remaining({ 'X-Forwarded-For': '203.0.113.7' })).toBe(first - 7);
});

test('a visitor cannot send CF-Connecting-IP himself: Cloudflare refuses the request', async ({ request }) => {
  // So the address the rate limits read from that header is always the one Cloudflare wrote
  const response = await request.get(`${LIVE_API_URL}/health`, { headers: { 'CF-Connecting-IP': '203.0.113.8' } });
  expect(response.status()).toBe(403);
  expect(response.headers()['ratelimit-remaining']).toBeUndefined();
});

test('main flow: a temporary account logs in, adds an expense, sees it on the Dashboard, and is deleted', async ({ page, request }) => {
  const stamp = Date.now();
  const email = `live-smoke-${stamp}@example.com`;
  const password = `live-smoke-${stamp}`;
  const registered = await request.post(`${LIVE_API_URL}/auth/register`, { data: { name: 'Live Smoke', email, password } });
  expect(registered.status()).toBe(201);
  const { token } = (await registered.json()).data;

  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Transactions' }).click();
    await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add transaction' });
    await dialog.getByLabel('Amount').fill('185000');
    await dialog.getByRole('button', { name: 'Food' }).click();
    await dialog.getByLabel('Note').fill('Live smoke lunch');
    await dialog.getByRole('button', { name: 'Save transaction' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Live smoke lunch').filter({ visible: true })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.locator('article', { hasText: 'Total Expense' })).toContainText('185,000');
  } finally {
    // Always deleted, also when a step above failed
    const deleted = await request.delete(`${LIVE_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password },
    });
    expect(deleted.status()).toBe(200);
  }

  // The account is gone: it cannot log in any more
  const login = await request.post(`${LIVE_API_URL}/auth/login`, { data: { email, password } });
  expect(login.status()).toBe(401);
});
