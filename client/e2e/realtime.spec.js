import { expect, test } from '@playwright/test';

// Phase 22: two browsers (two devices), one account. No reload anywhere in this file: every change has to arrive by itself.

const API_URL = 'http://localhost:4100/api';
const PASSWORD = 'secret123';

// A new account, made through the API
async function newAccount(request) {
  const email = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
  const response = await request.post(`${API_URL}/auth/register`, { data: { name: 'Live User', email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  const { token } = (await response.json()).data;
  return { email, token };
}

// A browser of its own (like a second device), signed in, with the page already open and the socket connected
async function openDevice(browser, { token }, path, contextOptions) {
  const context = await browser.newContext(contextOptions);
  await context.addInitScript((value) => {
    localStorage.setItem('token', value);
    localStorage.setItem('i18nextLng', 'en');
  }, token);
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.getByTestId('live-status')).toHaveAttribute('data-status', 'live');
  return { context, page };
}

async function foodCategory(request, token) {
  const response = await request.get(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } });
  return (await response.json()).data.find((category) => category.name === 'Food');
}

function today() {
  return new Date().toISOString();
}

test('a transaction added in browser 1 appears in browser 2 without a reload, and the dashboard follows', async ({ browser, request, baseURL }, testInfo) => {
  const account = await newAccount(request);
  const options = { baseURL, ...testInfo.project.use };
  const first = await openDevice(browser, account, '/transactions', options);
  const second = await openDevice(browser, account, '/transactions', options);
  const dashboard = await openDevice(browser, account, '/', options);

  // Browser 1 adds it through the page
  await first.page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = first.page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount').fill('77000');
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByLabel('Note').fill('Synced lunch');
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
  await expect(first.page.getByText('Synced lunch').filter({ visible: true })).toBeVisible();

  // Browser 2 and the dashboard of a third one get it by themselves
  await expect(second.page.getByText('Synced lunch').filter({ visible: true })).toBeVisible({ timeout: 5000 });
  await expect(dashboard.page.locator('article', { hasText: 'Expense' }).first()).toContainText('77,000', { timeout: 5000 });

  await Promise.all([first.context.close(), second.context.close(), dashboard.context.close()]);
});

test('a live refresh leaves an open dialog and what was typed in it alone', async ({ browser, request, baseURL }, testInfo) => {
  const account = await newAccount(request);
  const { context, page } = await openDevice(browser, account, '/transactions', { baseURL, ...testInfo.project.use });
  const food = await foodCategory(request, account.token);

  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Note').fill('Still typing');

  await request.post(`${API_URL}/transactions`, {
    headers: { Authorization: `Bearer ${account.token}` },
    data: { categoryId: food._id, amount: 12000, note: 'From another device', date: today() },
  });

  await expect(page.getByText('From another device').first()).toBeAttached({ timeout: 5000 });
  await expect(dialog.getByLabel('Note')).toHaveValue('Still typing');
  await context.close();
});

test('the bell counts a new notification at once', async ({ browser, request, baseURL }, testInfo) => {
  const account = await newAccount(request);
  const { context, page } = await openDevice(browser, account, '/', { baseURL, ...testInfo.project.use });
  const food = await foodCategory(request, account.token);
  const headers = { Authorization: `Bearer ${account.token}` };
  const month = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);

  await request.post(`${API_URL}/budgets`, { headers, data: { categoryId: food._id, month, amount: 100000 } });
  await request.post(`${API_URL}/transactions`, { headers, data: { categoryId: food._id, amount: 90000, date: today() } });

  // Far quicker than the poll of one minute
  await expect(page.getByRole('button', { name: /notifications/i }).first()).toContainText('1', { timeout: 5000 });
  await context.close();
});

test('log out of all devices: the other browser is logged out by itself', async ({ browser, request, baseURL }, testInfo) => {
  const account = await newAccount(request);
  const options = { baseURL, ...testInfo.project.use };
  const here = await openDevice(browser, account, '/settings', options);
  const there = await openDevice(browser, account, '/transactions', options);

  await here.page.getByRole('button', { name: 'Log out of all other devices' }).click();

  await expect(there.page).toHaveURL(/\/login$/, { timeout: 10000 });
  // This device got a new token and connects again
  await expect(here.page).toHaveURL(/\/settings$/);
  await expect(here.page.getByTestId('live-status')).toHaveAttribute('data-status', 'live', { timeout: 10000 });

  await Promise.all([here.context.close(), there.context.close()]);
});
