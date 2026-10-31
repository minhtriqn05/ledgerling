import { expect, test } from '@playwright/test';

// Breadcrumbs: every signed-in page has one, made from the route configuration. On a phone only the level above is
// shown ("‹ Reports"); the links that are visible are the ones to click on either screen.
const API_URL = 'http://localhost:4100/api';
const PASSWORD = 'secret123';
const PAGES = ['/', '/transactions', '/categories', '/budgets', '/recurring', '/goals', '/reports', '/notifications', '/settings'];

async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Crumb Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

const isPhone = (testInfo) => testInfo.project.name === 'mobile';
const crumbs = (page) => page.getByRole('navigation', { name: 'Breadcrumb' });

test('every page has a breadcrumb that ends with the current page', async ({ page }, testInfo) => {
  await register(page, testInfo, 'every');

  for (const path of PAGES) {
    await page.goto(path);
    const nav = crumbs(page);
    await expect(nav, path).toHaveCount(1);
    // The one item that is the current page (a screen reader hears it; on a phone it is only hidden from the eye)
    await expect(nav.locator('[aria-current="page"]'), path).toHaveCount(1);
    // The same words as the title of the page, except where the trail goes one level deeper
    if (path === '/') await expect(nav.locator('[aria-current="page"]')).toHaveText('Dashboard');
  }
});

test('Reports shows Dashboard / Reports / Monthly, and the tab is in the trail', async ({ page }, testInfo) => {
  await register(page, testInfo, 'reports');
  await page.goto('/reports');

  const nav = crumbs(page);
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Monthly');
  if (!isPhone(testInfo)) {
    await expect(nav.getByRole('listitem')).toHaveText(['Dashboard', 'Reports', 'Monthly']);
  }

  await page.getByRole('tab', { name: 'Yearly' }).click();
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Yearly');
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Calendar');
});

test('clicking the level above goes back to the right page', async ({ page }, testInfo) => {
  await register(page, testInfo, 'back');
  await page.goto('/reports?tab=yearly');

  const nav = crumbs(page);
  if (isPhone(testInfo)) {
    // "‹ Reports": the only link that is shown
    await expect(nav.getByRole('link')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeHidden();
    await nav.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');
  } else {
    await nav.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');

    await nav.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  }
});

test('Settings shows Settings / Profile, and its link goes up a level', async ({ page }, testInfo) => {
  await register(page, testInfo, 'settings');
  await page.goto('/settings');

  const nav = crumbs(page);
  await expect(nav.locator('[aria-current="page"]')).toHaveText('Profile');

  if (isPhone(testInfo)) {
    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  } else {
    await nav.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  }
});

test('Admin shows Admin / Users for an admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@e2e.test');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  await page.goto('/admin');
  await expect(crumbs(page).locator('[aria-current="page"]')).toHaveText('Users');
  await expect(crumbs(page).getByRole('link', { name: 'Admin' })).toBeVisible();
});

test('the transaction drawer adds "Transaction details", and its "Transactions" item closes it', async ({ page }, testInfo) => {
  await register(page, testInfo, 'drawer');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  const food = categories.find((c) => c.name === 'Food');
  await page.request.post(`${API_URL}/transactions`, { headers, data: { categoryId: food._id, amount: 45000, note: 'Pho' } });

  await page.goto('/transactions?sort=date_desc');
  await expect(crumbs(page).locator('[aria-current="page"]')).toHaveText('Transactions');
  await page.getByText('Pho').filter({ visible: true }).click();

  const drawer = page.getByRole('dialog', { name: 'Transaction details' });
  await expect(drawer).toBeVisible();
  // The trail is inside the drawer too: the page behind it is dimmed and cannot be clicked
  const trail = drawer.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Transaction details');
  const back = trail.getByRole('link', { name: 'Transactions' });
  await expect(back).toBeVisible();

  await back.click();
  await expect(drawer).toBeHidden();
  // Still on the list, with the filter of the address
  await expect(page).toHaveURL(/\/transactions\?sort=date_desc/);
  await expect(crumbs(page).locator('[aria-current="page"]')).toHaveText('Transactions');

  // And a link to a higher level leaves the page
  await page.getByText('Pho').filter({ visible: true }).click();
  if (!isPhone(testInfo)) {
    await drawer.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  }
});
