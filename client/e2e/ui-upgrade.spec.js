import { test, expect } from '@playwright/test';

// The UI upgrade: languages, category icons and the details drawer.

const API_URL = 'http://localhost:4100/api';

// Opens the menu on a phone (it is a dropdown there); on a desktop the sidebar is always open.
async function openMenu(page, testInfo, label = 'Open menu') {
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: label }).click();
}

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `ui-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('UI Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  return email;
}

test('a first visit is in English, whatever the browser language', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'de-DE' });
  const page = await context.newPage();
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('language-select')).toHaveValue('en');
  await context.close();
});

test('the language picker on the Login page changes the page, and server errors follow by their code', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('language-select').selectOption('vi');

  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

  // A wrong password: the API answers with the code INVALID_CREDENTIALS and an English message
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng');
});

test('switching to Tiếng Việt translates the menu, and F5 keeps the language', async ({ page }, testInfo) => {
  await register(page, testInfo, 'lang');
  await openMenu(page, testInfo);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Transactions' })).toBeVisible();

  await page.getByTestId('language-select').selectOption('vi');

  const translated = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(translated.getByRole('link', { name: 'Giao dịch' })).toBeVisible();
  await expect(translated.getByRole('link', { name: 'Ngân sách' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page).toHaveTitle('Tổng quan · Ledgerling');

  await page.reload();

  await openMenu(page, testInfo, 'Mở menu');
  await expect(translated.getByRole('link', { name: 'Giao dịch' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByTestId('language-select')).toHaveValue('vi');
});

test('category cards show an icon and never a letter, also for an old category without an icon', async ({ page }, testInfo) => {
  await register(page, testInfo, 'icons');

  // A category made through the API without an icon, like the ones saved before icons existed
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.post(`${API_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Zzz mystery', type: 'expense', color: '#4A9FE3' },
  });
  expect(response.status()).toBe(201);

  await page.goto('/categories');
  const cards = page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2 }) });
  await expect(cards.filter({ hasText: 'Zzz mystery' })).toBeVisible();

  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(6);
  for (let index = 0; index < count; index += 1) {
    const mark = cards.nth(index).getByTestId('category-mark');
    await expect(mark.locator('svg')).toBeVisible();
    await expect(mark).toHaveText(''); // no letter next to or instead of the icon
  }
});

test('a click on a transaction opens the details drawer, with Edit and Delete', async ({ page }, testInfo) => {
  await register(page, testInfo, 'drawer');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  const food = categories.find((c) => c.name === 'Food');
  await page.request.post(`${API_URL}/transactions`, {
    headers,
    data: { categoryId: food._id, amount: 45000, note: 'Pho', tags: ['lunch'] },
  });

  await page.goto('/transactions');
  await page.getByText('Pho').filter({ visible: true }).click();

  const drawer = page.getByRole('dialog', { name: 'Transaction details' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('−45,000');
  await expect(drawer).toContainText('Food');
  await expect(drawer).toContainText('#lunch');

  // Escape closes it
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  // Edit opens the form with the same transaction
  await page.getByText('Pho').filter({ visible: true }).click();
  await drawer.getByRole('button', { name: 'Edit', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Edit transaction' });
  await expect(form.getByLabel('Note')).toHaveValue('Pho');
  await form.getByRole('button', { name: 'Cancel' }).click();
  await expect(form).toBeHidden();

  // Delete removes it, with a few seconds to undo
  await page.getByText('Pho').filter({ visible: true }).click();
  await drawer.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Transaction deleted' })).toBeVisible();
  await expect(page.getByText('Pho').filter({ visible: true })).toHaveCount(0);
});

test('with prefers-reduced-motion the dialogs still open and close', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await register(page, testInfo, 'reduced');

  await page.getByRole('button', { name: 'Quick add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await context.close();
});
