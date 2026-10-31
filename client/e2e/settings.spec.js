import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { chooseOption } from './helpers/controls.js';

// The API started by playwright.config.js (in-memory database)
const API_URL = 'http://localhost:4100/api';
const PASSWORD = 'secret123';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

async function closeMenuIfNeeded(page) {
  const closeButton = page.getByRole('button', { name: 'Close menu' });
  if (await closeButton.isVisible()) await closeButton.click();
}

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label, name = 'Settings Tester') {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  return email;
}

// What another device would do: sign in with the API and get its own token
async function otherDeviceToken(page, email, password = PASSWORD) {
  const response = await page.request.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data.token;
}

// The status of GET /auth/me with a token: 200 while it works, 401 once it was ended
async function statusOf(page, token) {
  const response = await page.request.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return response.status();
}

async function myPreferences(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return (await response.json()).data.preferences;
}

test('a new name shows in the menu at once, and after a reload', async ({ page }, testInfo) => {
  await register(page, testInfo, 'name', 'Old Name');
  await openMenuIfNeeded(page);
  await expect(page.getByTestId('account-name')).toHaveText('Old Name');
  await expect(page.getByTestId('account')).toContainText('O'); // the avatar letter

  // Settings is in the menu
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // The save button is off until the name changes
  const save = page.getByRole('button', { name: 'Save changes' });
  await expect(save).toBeDisabled();
  await page.getByLabel('Name', { exact: true }).fill('Brand New Name');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Name updated')).toBeVisible();

  // Menu and avatar changed without a reload
  await openMenuIfNeeded(page);
  await expect(page.getByTestId('account-name')).toHaveText('Brand New Name');
  await expect(page.getByTestId('account')).toContainText('B');
  await closeMenuIfNeeded(page);

  // An empty name is refused
  await page.getByLabel('Name', { exact: true }).fill('   ');
  await save.click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please enter your name.' })).toBeVisible();

  await page.reload();
  await openMenuIfNeeded(page);
  await expect(page.getByTestId('account-name')).toHaveText('Brand New Name');
});

test('dark mode is applied at once, kept after F5, and follows the account to another device', async ({ page }, testInfo) => {
  const email = await register(page, testInfo, 'theme');
  const html = page.locator('html');
  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');

  // Dark: the page changes colors at once
  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(darkBackground).not.toBe(lightBackground);
  expect(await page.evaluate(() => localStorage.getItem('ledgerling.theme'))).toBe('dark');
  await expect.poll(async () => (await myPreferences(page)).theme).toBe('dark');

  // F5: still dark, and the Dark option is still the chosen one
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(darkBackground);
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');

  // The charts are read in the dark theme too: the Reports page opens without an error
  await page.goto('/reports?tab=yearly');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();

  // Another device has no theme in localStorage: after signing in it gets the one saved on the account
  await openMenuIfNeeded(page);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.evaluate(() => localStorage.removeItem('ledgerling.theme'));
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  // The login sends the person back to the page they were on (Reports)
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Back to light
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('system theme follows the device', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await register(page, testInfo, 'system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('change the password, then log in with the new one (the old token stops working)', async ({ page }, testInfo) => {
  const email = await register(page, testInfo, 'password');
  const oldToken = await otherDeviceToken(page, email);
  expect(await statusOf(page, oldToken)).toBe(200);

  await page.goto('/settings');
  const current = page.getByLabel('Current password');
  const next = page.getByLabel('New password', { exact: true });
  const repeat = page.getByLabel('Repeat new password');

  // The strength bar follows the typing
  await next.fill('abc');
  await expect(page.getByText('Password strength: Weak')).toBeVisible();
  await next.fill('Password1');
  await expect(page.getByText('Password strength: Medium')).toBeVisible();
  await next.fill('Correct-Horse-42');
  await expect(page.getByText('Password strength: Strong')).toBeVisible();

  // A wrong current password is refused and this device stays signed in
  await current.fill('not-my-password');
  await repeat.fill('Correct-Horse-42');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The password is incorrect' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // Two different new passwords are refused before the server is asked
  await current.fill(PASSWORD);
  await repeat.fill('Correct-Horse-43');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "The two new passwords don't match." })).toBeVisible();

  // Now the right ones
  await repeat.fill('Correct-Horse-42');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed. Other devices were logged out.')).toBeVisible();
  await expect(current).toHaveValue('');

  // This device got a new token: it is still signed in after a reload. The other device's token is dead.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(await statusOf(page, oldToken)).toBe(401);

  // Log out, the old password no longer works, the new one does
  await openMenuIfNeeded(page);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill('Correct-Horse-42');
  await page.getByRole('button', { name: 'Log in' }).click();
  // The login sends the person back to the page they were on (Settings)
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
});

test('log out of all other devices keeps this one signed in', async ({ page }, testInfo) => {
  const email = await register(page, testInfo, 'sessions');
  const otherDevice = await otherDeviceToken(page, email);
  expect(await statusOf(page, otherDevice)).toBe(200);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log out of all other devices' }).click();
  await expect(page.getByText('Logged out of all other devices.')).toBeVisible();
  expect(await statusOf(page, otherDevice)).toBe(401);

  // Still signed in here, also after a reload and on another page
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
});

test('the week can start on Sunday, and the calendar in Reports follows', async ({ page }, testInfo) => {
  await register(page, testInfo, 'week');
  const weekdays = page.getByRole('group', { name: /^Calendar of / }).locator('span[aria-hidden="true"]').filter({ hasText: /^[A-Z][a-z]{2}$/ });

  await page.goto('/reports?tab=calendar');
  await expect(weekdays.first()).toHaveText('Mon');

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sunday' }).click();
  await expect(page.getByText('Preference saved')).toBeVisible();
  await expect.poll(async () => (await myPreferences(page)).weekStartsOn).toBe('sunday');

  await page.goto('/reports?tab=calendar');
  await expect(weekdays.first()).toHaveText('Sun');
  await expect(weekdays.last()).toHaveText('Sat');

  // Back to Monday
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Monday' }).click();
  await expect.poll(async () => (await myPreferences(page)).weekStartsOn).toBe('monday');
});

test('the language chosen in the menu is saved on the account and comes back on another device', async ({ page }, testInfo) => {
  await register(page, testInfo, 'language');
  await openMenuIfNeeded(page);
  await chooseOption(page.getByTestId('language-select'), 'Deutsch');
  await expect(page.getByRole('heading', { name: 'Übersicht', level: 1 })).toBeVisible();
  await expect.poll(async () => (await myPreferences(page)).language).toBe('de');

  // Another device: no language in localStorage. The account's language is applied once the user is known.
  await page.evaluate(() => localStorage.removeItem('ledgerling.language'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Übersicht', level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test('download my data: a JSON file with the profile and the data, never the password hash', async ({ page }, testInfo) => {
  const email = await register(page, testInfo, 'export');
  await page.goto('/settings');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ledgerling-data-\d{4}-\d{2}-\d{2}\.json$/);

  const text = await readFile(await download.path(), 'utf8');
  const data = JSON.parse(text);
  expect(data.profile.email).toBe(email);
  expect(data.categories.length).toBeGreaterThan(0);
  expect(Object.keys(data)).toEqual(
    expect.arrayContaining(['profile', 'categories', 'transactions', 'budgets', 'recurringRules', 'goals', 'templates'])
  );
  expect(text).not.toContain('passwordHash');
  await expect(page.getByText('Your data was downloaded.')).toBeVisible();
});

test('delete the account: the button needs DELETE and the password, then everything is gone', async ({ page }, testInfo) => {
  const email = await register(page, testInfo, 'delete');
  await page.goto('/settings');

  const confirmWord = page.getByLabel('Type DELETE to confirm');
  const password = page.getByLabel('Your password');
  const button = page.getByRole('button', { name: 'Delete my account' });

  await expect(button).toBeDisabled();
  await confirmWord.fill('delete');
  await password.fill(PASSWORD);
  await expect(button).toBeDisabled(); // lower case does not count
  await confirmWord.fill('DELETE');
  await expect(button).toBeEnabled();

  // A wrong password is refused, and the person stays signed in
  await password.fill('wrong-password');
  await button.click();
  await expect(page.getByRole('alert').filter({ hasText: 'The password is incorrect' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // The right one deletes the account and logs out
  await password.fill(PASSWORD);
  await button.click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Your account was deleted.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

  // The account does not exist any more
  const login = await page.request.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(401);
});
