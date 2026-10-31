import { expect, test } from '@playwright/test';

// Phase 21: the public landing page, the one-click demo account and the "Get started" card.
// The API (playwright.config.js, in-memory database) seeds the demo account when it starts (server/src/e2e.js).
const API_URL = 'http://localhost:4100/api';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

async function tryTheDemo(page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

test('a visitor who opens the site sees the landing page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Know where your money goes.', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ledgerling' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();
  await expect(page).toHaveTitle(/Ledgerling/);
});

test('the landing page has six features, screenshots with alt text, three steps and a GitHub link', async ({ page }) => {
  await page.goto('/welcome');

  const features = page.getByRole('region', { name: 'Everything you need to stay on top of your money' });
  await expect(features.getByRole('listitem')).toHaveCount(6);

  const shots = page.getByRole('region', { name: 'See it in action' }).getByRole('img');
  await expect(shots).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    await shots.nth(i).scrollIntoViewIfNeeded();
    // The picture really loaded (not a broken image)
    await expect.poll(() => shots.nth(i).evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(shots.nth(i)).toHaveAttribute('alt', /.{10,}/);
  }

  await expect(page.getByRole('region', { name: 'How it works' }).locator('ol > li')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /View on GitHub/ })).toHaveAttribute('href', /github\.com\/minhtriqn05\/ledgerling/);
});

test('Get started and Log in lead to the register and login pages', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.goto('/welcome');
  await page.getByRole('link', { name: 'Log in' }).last().click();
  await expect(page).toHaveURL(/\/login$/);
});

test('the page follows the language that is chosen', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByTestId('language-select').click();
  await page.getByRole('option', { name: 'Tiếng Việt' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('button', { name: 'Dùng thử bản demo' })).toBeVisible();
});

test('Try the demo says the server is starting, then opens the Dashboard with data', async ({ page }) => {
  // The free Render server needs up to a minute to wake up: a slow answer shows the waiting text
  await page.route('**/api/auth/demo', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Starting the server, this can take up to a minute' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeDisabled();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  // Real numbers, not an empty account
  await expect(page.getByTestId('stat-income')).not.toHaveText(/^0\s/);
  await expect(page.getByTestId('stat-expense')).not.toHaveText(/^0\s/);
  await expect(page.getByTestId('get-started')).toHaveCount(0);
  // The Food budget is over its limit, the Entertainment one is close
  await expect(page.getByText('Budget alerts')).toBeVisible();
  await expect(page.getByText(/Over by/)).toBeVisible();
  await expect(page.getByText('Savings goals').first()).toBeVisible();
  await openMenuIfNeeded(page);
  await expect(page.getByTestId('account-name')).toHaveText('Demo User');
});

test('Try the demo explains it when the demo account is not on the server (503), and works again later', async ({ page }) => {
  // What a server whose database was never seeded answers (see `npm run seed`)
  let seeded = false;
  await page.route('**/api/auth/demo', async (route) => {
    if (seeded) return route.continue();
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Demo account is not available', code: 'DEMO_UNAVAILABLE' }),
    });
  });
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();

  // A message in plain words instead of silence; the button works again; nobody is signed in
  await expect(page.getByRole('alert')).toContainText('The demo is not available right now. Please try again later.');
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeEnabled();
  await expect(page).toHaveURL(/\/welcome$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

  // Once the account exists, the same button signs in
  seeded = true;
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
});

test('the footer names the course class', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.getByRole('contentinfo')).toContainText('UIT · CSBU109.R11.KHBC');
});

test('the demo account has 3 months of transactions, two rules and no hand-made Rent or Salary', async ({ page }) => {
  await tryTheDemo(page);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };

  const all = await (await page.request.get(`${API_URL}/transactions?from=2000-01-01&limit=100`, { headers })).json();
  expect(all.meta.total).toBeGreaterThanOrEqual(85);
  const rules = await (await page.request.get(`${API_URL}/recurring`, { headers })).json();
  expect(rules.data.map((rule) => rule.category.name).sort()).toEqual(['Rent', 'Salary']);
});

test('a signed-in user who opens /welcome stays there and sees Open app instead of Log in and Get started', async ({ page }) => {
  await tryTheDemo(page);

  await page.goto('/welcome');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Know where your money goes.', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Get started' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Open app' }).last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
});

test('Settings has no Security and Danger zone for the demo account, also when the address is typed', async ({ page }) => {
  await tryTheDemo(page);
  await page.goto('/settings/profile');

  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.getByText('You are using the shared demo account')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.goto('/settings/appearance');
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  for (const hidden of ['security', 'danger']) {
    await page.goto(`/settings/${hidden}`);
    await expect(page).toHaveURL(/\/settings(\/profile)?$/);
    await expect(page.getByRole('link', { name: /^Security/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Danger zone/ })).toHaveCount(0);
  }
  for (const hidden of ['Password', 'Sessions', 'Danger zone']) {
    await expect(page.getByRole('heading', { name: hidden, exact: true })).toHaveCount(0);
  }
});

test('the API refuses the demo account to change the password, log out everywhere or delete itself', async ({ page }) => {
  await tryTheDemo(page);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };

  const password = await page.request.patch(`${API_URL}/users/me/password`, {
    headers,
    data: { currentPassword: 'demo-e2e-secret', newPassword: 'visitor-new-pass' },
  });
  const logoutAll = await page.request.post(`${API_URL}/auth/logout-all`, { headers });
  const remove = await page.request.delete(`${API_URL}/users/me`, { headers, data: { password: 'demo-e2e-secret' } });

  for (const response of [password, logoutAll, remove]) {
    expect(response.status()).toBe(403);
    expect((await response.json()).code).toBe('DEMO_READ_ONLY');
  }
  // The demo can still be used
  expect((await page.request.get(`${API_URL}/auth/me`, { headers })).status()).toBe(200);
});

test('an empty Dashboard shows the Get started card, and ticks a step once it is done', async ({ page }, testInfo) => {
  const email = `e2e-onboarding-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('New Person');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  const card = page.getByTestId('get-started');
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading', { name: 'Get started with Ledgerling' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Add your first transaction' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Set a budget' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Create a savings goal' })).toBeVisible();
  await expect(card.getByText('0 of 3 done')).toBeVisible();

  // Create a goal (setup through the API), then the step has its tick after a reload
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const created = await page.request.post(`${API_URL}/goals`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Trip', targetAmount: 5000000, color: '#4A9FE3' },
  });
  expect(created.status()).toBe(201);
  await page.reload();
  await expect(card.getByText('1 of 3 done')).toBeVisible();
  await expect(card.locator('li[data-done="true"]')).toHaveCount(1);
  await expect(card.locator('li[data-done="true"]')).toContainText('Create a savings goal');

  // The step links to its page
  await card.getByRole('link', { name: 'Set a budget' }).click();
  await expect(page).toHaveURL(/\/budgets$/);
});
