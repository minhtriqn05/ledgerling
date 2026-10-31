import { expect, test } from '@playwright/test';
import { chooseOption, dateField, pickDate } from './helpers/controls.js';

// The form controls Ledgerling draws itself: the Select lists, the calendar of the DatePicker,
// the CSV drop zone and the checkboxes. None of them is a browser default any more.

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `controls-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Controls Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Today in Vietnam, "YYYY-MM-DD"
function today() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test('the transaction filters use the custom list and calendar', async ({ page }, testInfo) => {
  await register(page, testInfo, 'filters');
  await page.goto('/transactions');

  // The category list is grouped by type and closes after a choice
  const category = page.getByLabel('Category', { exact: true });
  await category.click();
  const list = page.getByRole('listbox');
  await expect(list.getByRole('group', { name: 'Expense' })).toBeVisible();
  await expect(list.getByRole('group', { name: 'Income' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();

  await chooseOption(category, 'Food');
  await expect(page).toHaveURL(/category=/);
  await expect(category).toHaveText('Food');

  // From: a calendar in the user's language; the day goes to the URL
  const day = `${today().slice(0, 8)}01`;
  await pickDate(page, 'From', day);
  await expect(page).toHaveURL(new RegExp(`from=${day}`));
  await expect(dateField(page, 'From')).toHaveAttribute('data-value', day);

  // "Clear" in the calendar empties an optional date
  await dateField(page, 'From').click();
  await page.getByRole('dialog', { name: 'Choose a date' }).getByRole('button', { name: 'Clear' }).click();
  await expect(page).not.toHaveURL(/from=/);
  await expect(dateField(page, 'From')).toHaveText('Pick a date');
});

test('Escape closes the calendar inside a dialog, and not the dialog', async ({ page }, testInfo) => {
  await register(page, testInfo, 'escape');
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });

  await dateField(dialog, 'Date').click();
  const calendar = page.getByRole('dialog', { name: 'Choose a date' });
  await expect(calendar).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(calendar).toBeHidden();
  await expect(dialog).toBeVisible();
});

test('the CSV drop zone shows the chosen file', async ({ page }, testInfo) => {
  await register(page, testInfo, 'drop');
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import CSV' });

  await expect(dialog.getByText('Drag your CSV file here')).toBeVisible();
  const csv = `Date,Type,Category,Amount,Currency,Note,Tags\r\n${today()} 12:00,expense,Food,45000,VND,Lunch,`;
  await dialog.getByLabel('CSV file').setInputFiles({ name: 'october.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

  await expect(dialog.getByText('october.csv')).toBeVisible();
  await expect(dialog.getByText('Choose another file')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Import 1 row' })).toBeEnabled();
});
