import { expect, test } from '@playwright/test';

// The API Playwright starts (see playwright.config.js). Used to put data in quickly, so each test only
// clicks through the part it is about.
const API_URL = 'http://localhost:4100/api';

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Quick Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

const authHeaders = async (page) => ({ Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` });

// Creates transactions through the API for the signed-in user. rows: [{ category: 'Food', amount, note, tags }]
async function seed(page, rows) {
  const headers = await authHeaders(page);
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  const idOf = (name) => categories.find((c) => c.name === name)._id;

  for (const { category, ...rest } of rows) {
    const res = await page.request.post(`${API_URL}/transactions`, { headers, data: { categoryId: idOf(category), ...rest } });
    expect(res.status()).toBe(201);
  }
}

// Creates a template through the API
async function seedTemplate(page, { category, ...rest }) {
  const headers = await authHeaders(page);
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  const res = await page.request.post(`${API_URL}/templates`, {
    headers,
    data: { categoryId: categories.find((c) => c.name === category)._id, ...rest },
  });
  expect(res.status()).toBe(201);
}

// How many transactions the user has this month, straight from the API
async function transactionCount(page) {
  const headers = await authHeaders(page);
  const res = await page.request.get(`${API_URL}/transactions?limit=100`, { headers });
  return (await res.json()).meta.total;
}

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

// Only the notes of the rows that are on screen (a table on desktop, a list on phones: one of them is hidden)
const visibleNotes = (page, pattern) => page.getByText(pattern).filter({ visible: true });

// The rows of the list that are on screen: the table on desktop, the list on phones
const rows = (page) => page.locator('table, ul').filter({ visible: true });

// Deletes one row with its own delete control: the trash button in the table, or (on a phone, where a tap opens
// the edit dialog) the Delete button of that dialog.
async function deleteRow(page, testInfo, note) {
  if (testInfo.project.name === 'mobile') {
    await visibleNotes(page, note).click();
    const dialog = page.getByRole('dialog', { name: 'Edit transaction' });
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  } else {
    await page.getByRole('button', { name: `Delete ${note}` }).click();
  }
}

test('the N key opens Quick add, "coffee 35k #work" is understood and the open page shows it', async ({ page }, testInfo) => {
  await register(page, testInfo, 'nkey');
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: /^No transactions in / })).toBeVisible();

  // 1. N opens the dialog
  await page.keyboard.press('n');
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await expect(dialog).toBeVisible();

  // 2. One line is enough: the fields below show what was understood
  await dialog.getByLabel('Quick text').fill('coffee 35k #work');
  await expect(dialog.getByLabel('Amount')).toHaveValue('35.000');
  await expect(dialog.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByLabel('Note')).toHaveValue('coffee');
  await expect(dialog.getByRole('button', { name: 'Remove tag work' })).toBeVisible();

  // 3. Save: a toast, and the list behind the dialog loads again by itself
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page.getByText('Transaction added')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(visibleNotes(page, 'coffee')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter by tag work' }).filter({ visible: true })).toBeVisible();
  await expect(rows(page)).toContainText('−35.000 ₫');
  await expect(page.getByText(/· 1 transaction$/)).toBeVisible();
  // The category is Food, with its icon
  await expect(rows(page)).toContainText('Food');
  await expect(rows(page)).toContainText('🍜');
});

test('the + button opens Quick add on any page; "salary 15tr yesterday" picks an income category and the day', async ({
  page,
}, testInfo) => {
  await register(page, testInfo, 'fab');

  // The Dashboard has the button too
  await page.getByRole('button', { name: 'Quick add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await dialog.getByLabel('Quick text').fill('salary 15tr yesterday');
  await expect(dialog.getByLabel('Amount')).toHaveValue('15.000.000');
  await expect(dialog.getByRole('button', { name: 'Salary' })).toHaveAttribute('aria-pressed', 'true');

  const yesterday = new Date(Date.now() + 7 * 3600 * 1000 - 24 * 3600 * 1000).toISOString().slice(0, 10);
  await expect(dialog.getByLabel('Date')).toHaveValue(yesterday);

  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();

  // The Dashboard reloaded: the income card shows it
  await expect(page.locator('article', { hasText: 'Total Income' })).toContainText('15.000.000');
});

test('Quick add: the default categories show their icons, and a field edited by hand is kept', async ({ page }, testInfo) => {
  await register(page, testInfo, 'icons');
  await page.getByRole('button', { name: 'Quick add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick add' });

  await expect(dialog.getByRole('button', { name: 'Food' })).toContainText('🍜');
  await expect(dialog.getByRole('button', { name: 'Transport' })).toContainText('🚌');

  await dialog.getByLabel('Quick text').fill('coffee 35k');
  await dialog.getByLabel('Amount').fill('50000');
  await dialog.getByLabel('Quick text').fill('coffee 99k');
  await expect(dialog.getByLabel('Amount')).toHaveValue('50.000');
});

test('a template chip saves a transaction in one click; "Save as template" makes the chip', async ({ page }, testInfo) => {
  await register(page, testInfo, 'templates');
  await seedTemplate(page, { name: 'Morning coffee', category: 'Food', amount: 35000, note: 'Coffee run' });
  await page.goto('/transactions');

  // 1. The chip: one click, no other field needed
  await page.getByRole('button', { name: 'Quick add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await dialog.getByRole('button', { name: /^Morning coffee/ }).click();
  await expect(page.getByText('Added "Morning coffee"')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(visibleNotes(page, 'Coffee run')).toBeVisible();
  await expect(rows(page)).toContainText('−35.000 ₫');

  // 2. "Save as template" in the transaction dialog
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const form = page.getByRole('dialog', { name: 'Add transaction' });
  await form.getByLabel('Amount').fill('60000');
  await form.getByRole('button', { name: 'Transport' }).click();
  await form.getByLabel('Note').fill('Grab to work');
  await form.getByLabel('Save as template').check();
  await form.getByLabel('Template name').fill('Commute');
  await form.getByRole('button', { name: 'Save transaction' }).click();
  await expect(form).toBeHidden();
  await expect(visibleNotes(page, 'Grab to work')).toBeVisible();

  // 3. Both templates are chips now; a click saves the new one
  await page.getByRole('button', { name: 'Quick add' }).click();
  const second = page.getByRole('dialog', { name: 'Quick add' });
  await expect(second.getByRole('button', { name: /^Morning coffee/ })).toBeVisible();
  await second.getByRole('button', { name: /^Commute/ }).click();
  await expect(second).toBeHidden();
  await expect(visibleNotes(page, 'Grab to work')).toHaveCount(2);

  // 4. A template can be deleted from its chip
  await page.getByRole('button', { name: 'Quick add' }).click();
  const third = page.getByRole('dialog', { name: 'Quick add' });
  await third.getByRole('button', { name: 'Delete template Commute' }).click();
  await expect(third.getByRole('button', { name: /^Commute/ })).toHaveCount(0);
  await expect(third.getByRole('button', { name: /^Morning coffee/ })).toBeVisible();
});

test('a category icon picked in the form shows on its card and in the lists', async ({ page }, testInfo) => {
  await register(page, testInfo, 'catIcon');
  await page.goto('/categories');

  await page.getByLabel('Name').fill('Gym');
  await page.getByRole('button', { name: '🏋️' }).click();
  await expect(page.getByRole('button', { name: '🏋️' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByRole('heading', { name: 'Gym', level: 2 })).toBeVisible();
  await expect(page.locator('li', { has: page.getByRole('heading', { name: 'Gym', level: 2 }) })).toContainText('🏋️');

  // It is on the chip of the Quick add dialog too
  await page.getByRole('button', { name: 'Quick add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quick add' });
  await expect(dialog.getByRole('button', { name: 'Gym' })).toContainText('🏋️');
});

test('tick rows, change their category, then delete the ticked ones after confirming', async ({ page }, testInfo) => {
  await register(page, testInfo, 'bulk');
  await seed(page, [
    { category: 'Food', amount: 10000, note: 'Lunch' },
    { category: 'Food', amount: 20000, note: 'Dinner' },
    { category: 'Food', amount: 30000, note: 'Snack' },
    { category: 'Bills', amount: 40000, note: 'Water' },
  ]);
  await page.goto('/transactions');
  await expect(page.getByText('4 transactions', { exact: true })).toBeVisible();

  // 1. Nothing ticked: no bulk bar
  await expect(page.getByRole('region', { name: 'Bulk actions' })).toHaveCount(0);

  // 2. Tick two rows: the bar counts them
  await page.getByRole('checkbox', { name: 'Select Lunch' }).check();
  await page.getByRole('checkbox', { name: 'Select Dinner' }).check();
  const bar = page.getByRole('region', { name: 'Bulk actions' });
  await expect(bar.getByText('2 selected')).toBeVisible();

  // 3. Change category: the two rows move to Transport, the others stay
  await bar.getByRole('button', { name: 'Change category' }).click();
  const categoryDialog = page.getByRole('dialog', { name: 'Change category' });
  await categoryDialog.getByRole('button', { name: 'Transport' }).click();
  await categoryDialog.getByRole('button', { name: 'Change category' }).click();
  await expect(page.getByText('Moved 2 transactions to Transport')).toBeVisible();
  await expect(categoryDialog).toBeHidden();
  await page.goto(`/transactions?category=${await categoryIdOf(page, 'Transport')}`);
  await expect(page.getByText('2 transactions', { exact: true })).toBeVisible();
  await expect(visibleNotes(page, 'Lunch')).toBeVisible();
  await expect(visibleNotes(page, 'Dinner')).toBeVisible();

  // 4. The selection is gone after the reload; tick every row of the page, then delete
  await page.goto('/transactions');
  await expect(page.getByText('4 transactions', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Bulk actions' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Select all on this page' }).check();
  await expect(page.getByRole('region', { name: 'Bulk actions' }).getByText('4 selected')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select Water' }).uncheck();
  await expect(page.getByRole('region', { name: 'Bulk actions' }).getByText('3 selected')).toBeVisible();

  // 5. Delete asks first: Cancel keeps everything
  await page.getByRole('button', { name: 'Delete selected' }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete 3 transactions?' });
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByText('4 transactions', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete selected' }).click();
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Deleted 3 transactions')).toBeVisible();
  await expect(page.getByText('1 transaction', { exact: true })).toBeVisible();
  await expect(visibleNotes(page, 'Water')).toBeVisible();
  await expect(visibleNotes(page, 'Lunch')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Bulk actions' })).toHaveCount(0);
});

async function categoryIdOf(page, name) {
  const headers = await authHeaders(page);
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  return categories.find((c) => c.name === name)._id;
}

test('delete a row, then Undo brings it back and it is never deleted', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await register(page, testInfo, 'undo');
  await seed(page, [
    { category: 'Food', amount: 10000, note: 'Lunch' },
    { category: 'Food', amount: 20000, note: 'Dinner' },
  ]);
  await page.goto('/transactions');
  await expect(page.getByText('2 transactions', { exact: true })).toBeVisible();

  // 1. The row is gone at once, with an Undo button in the toast
  await deleteRow(page, testInfo, 'Lunch');
  await expect(visibleNotes(page, 'Lunch')).toHaveCount(0);
  await expect(page.getByText('1 transaction', { exact: true })).toBeVisible();
  await expect(page.getByText('Transaction deleted')).toBeVisible();
  // ... and nothing was deleted on the server yet
  expect(await transactionCount(page)).toBe(2);

  // 2. Undo: the row is back
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(visibleNotes(page, 'Lunch')).toBeVisible();
  await expect(page.getByText('2 transactions', { exact: true })).toBeVisible();

  // 3. Wait longer than the 5 seconds: it was never deleted
  await page.waitForTimeout(6000);
  expect(await transactionCount(page)).toBe(2);
  await page.reload();
  await expect(visibleNotes(page, 'Lunch')).toBeVisible();
});

test('a deleted row is really deleted after 5 seconds, and at once when the page is left', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await register(page, testInfo, 'undo2');
  await seed(page, [
    { category: 'Food', amount: 10000, note: 'Lunch' },
    { category: 'Food', amount: 20000, note: 'Dinner' },
    { category: 'Food', amount: 30000, note: 'Snack' },
  ]);
  await page.goto('/transactions');
  await expect(page.getByText('3 transactions', { exact: true })).toBeVisible();

  // 1. No Undo: the delete reaches the server by itself within a few seconds
  await deleteRow(page, testInfo, 'Lunch');
  await expect(visibleNotes(page, 'Lunch')).toHaveCount(0);
  expect(await transactionCount(page)).toBe(3);
  await expect.poll(() => transactionCount(page), { timeout: 15000 }).toBe(2);

  // 2. Leaving the page deletes what is still waiting, without the 5 seconds
  await expect(page.getByText('2 transactions', { exact: true })).toBeVisible();
  await deleteRow(page, testInfo, 'Dinner');
  await expect(visibleNotes(page, 'Dinner')).toHaveCount(0);
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect.poll(() => transactionCount(page), { timeout: 3000 }).toBe(1);
});

test('keyboard shortcuts: ? lists them, / jumps to the search box, N is ignored while typing', async ({ page }, testInfo) => {
  await register(page, testInfo, 'keys');

  // 1. ? opens the list, Escape closes it
  await page.keyboard.press('?');
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts.getByText('Quick add a transaction')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shortcuts).toBeHidden();

  // 2. / on another page opens Transactions and puts the cursor in the search box
  await page.keyboard.press('/');
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  const search = page.getByLabel('Search notes');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue(''); // the / was not typed into the box

  // 3. Typing "n" in the box types a letter; it does not open Quick add
  await page.keyboard.type('nn');
  await expect(search).toHaveValue('nn');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // 4. Outside a field, N opens Quick add; inside the dialog the key is just a letter, and Escape closes it
  await page.getByRole('heading', { name: 'Transactions', level: 1 }).click();
  await page.keyboard.press('n');
  const quick = page.getByRole('dialog', { name: 'Quick add' });
  await expect(quick).toBeVisible();
  await expect(quick.getByLabel('Quick text')).toBeFocused();
  await page.keyboard.type('n');
  await expect(quick.getByLabel('Quick text')).toHaveValue('n');
  await page.keyboard.press('Escape');
  await expect(quick).toBeHidden();
});

test('the lists show grey placeholders while they load', async ({ page }, testInfo) => {
  await register(page, testInfo, 'skeleton');
  // Slow the list down so the placeholder can be seen
  await page.route('**/api/transactions?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/transactions');
  const loading = page.getByRole('status').filter({ hasText: 'Loading transactions…' });
  await expect(loading).toBeVisible();
  // The words are only for screen readers: what is drawn is the grey shapes
  await expect(loading.locator('span[aria-hidden="true"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /^No transactions in / })).toBeVisible();
});
