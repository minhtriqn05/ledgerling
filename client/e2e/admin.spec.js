import { expect, test } from '@playwright/test';

// Phase 19: the Admin page and who may open it.
// The API started by playwright.config.js (in-memory database) already holds one admin account (server/src/e2e.js).
const API_URL = 'http://localhost:4100/api';
const ADMIN = { email: 'admin@e2e.test', password: 'secret123' };
const PASSWORD = 'secret123';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

async function logIn(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// A normal account made through the API (faster than the form), unique per test and per project
async function newUser(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  const name = `Person ${label} ${testInfo.project.name}`;
  const response = await page.request.post(`${API_URL}/auth/register`, { data: { name, email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  return { name, email, password: PASSWORD, token: (await response.json()).data.token };
}

const loginStatus = async (page, { email, password }) =>
  (await page.request.post(`${API_URL}/auth/login`, { data: { email, password } })).status();

const meStatus = async (page, token) =>
  (await page.request.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status();

test('an admin sees the statistics, finds a user and disables and enables the account', async ({ page, browser }, testInfo) => {
  const target = await newUser(page, testInfo, 'target');
  await logIn(page, ADMIN);

  // The Admin entry is in the menu
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible();

  // Number cards and the two charts
  const totals = page.getByRole('region', { name: 'Site totals' });
  await expect(totals.getByText('Users', { exact: true })).toBeVisible();
  await expect(totals.getByText('Active in the last 7 days')).toBeVisible();
  await expect(totals.getByText('Transactions', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Line chart: new users per day over the last 30 days' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Line chart: transactions per day over the last 30 days' })).toBeVisible();

  // The table of accounts is one level below
  await page.getByRole('button', { name: 'Manage users' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

  // Search finds the new account (the admin is in the table too, with no button on its own row)
  await page.getByLabel('Search by name or email').fill(target.email);
  const row = page.getByRole('row').filter({ hasText: target.email });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Active', { exact: true })).toBeVisible();
  await page.getByLabel('Search by name or email').fill(ADMIN.email);
  const adminRow = page.getByRole('row').filter({ hasText: ADMIN.email });
  await expect(adminRow).toHaveCount(1);
  await expect(adminRow.getByText('You', { exact: true })).toBeVisible();
  await expect(adminRow.getByRole('button')).toHaveCount(0);
  await page.getByLabel('Search by name or email').fill(target.email);
  await expect(row).toHaveCount(1);

  // Disable: nothing happens until the dialog is confirmed
  await row.getByRole('button', { name: `Disable ${target.name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Disable this account?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await loginStatus(page, target)).toBe(200);

  await row.getByRole('button', { name: `Disable ${target.name}` }).click();
  await page.getByRole('dialog', { name: 'Disable this account?' }).getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(page.getByText(`${target.name} was disabled`)).toBeVisible();
  await expect(row.getByText('Disabled', { exact: true })).toBeVisible();

  // The API agrees: no login (403), the old token is dead (401)
  expect(await loginStatus(page, target)).toBe(403);
  expect(await meStatus(page, target.token)).toBe(401);

  // And the person sees why on the login page
  const stranger = await browser.newContext();
  const loginPage = await stranger.newPage();
  await loginPage.goto('http://localhost:5174/login');
  await loginPage.getByLabel('Email').fill(target.email);
  await loginPage.getByLabel('Password', { exact: true }).fill(target.password);
  await loginPage.getByRole('button', { name: 'Log in' }).click();
  await expect(loginPage.getByRole('alert').filter({ hasText: 'This account has been disabled' })).toBeVisible();
  await stranger.close();

  // Enable again
  await row.getByRole('button', { name: `Enable ${target.name}` }).click();
  await page.getByRole('dialog', { name: 'Enable this account?' }).getByRole('button', { name: 'Enable', exact: true }).click();
  await expect(page.getByText(`${target.name} was enabled`)).toBeVisible();
  await expect(row.getByText('Active', { exact: true })).toBeVisible();
  expect(await loginStatus(page, target)).toBe(200);
});

test('a normal user has no Admin entry, is sent back from /admin and gets 403 from the API', async ({ page }, testInfo) => {
  const user = await newUser(page, testInfo, 'plain');
  await logIn(page, user);

  await openMenuIfNeeded(page);
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  // Typing the address does not help: back to the Dashboard
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // The API refuses on its own
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  expect((await page.request.get(`${API_URL}/admin/stats`, { headers })).status()).toBe(403);
  expect((await page.request.get(`${API_URL}/admin/users`, { headers })).status()).toBe(403);
});

test('someone who is not signed in is sent to the login page from /admin', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
