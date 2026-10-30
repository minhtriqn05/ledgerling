import { expect, test } from '@playwright/test';
import { formatDate } from '../src/utils/format.js';
import { currentMonth, fromDateInput, shiftMonth } from '../src/utils/vnDate.js';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Recurring Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// The label inside the page content (the menu also has a "Recurring" link). A table on desktop and a list
// on phones are both in the page: only the one on screen counts.
const recurringLabels = (page) => page.locator('main').getByText('Recurring', { exact: true }).filter({ visible: true });

test('create a rule that started last month → its transactions appear with the Recurring label', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'rule');

  // The 1st of last month, so two runs are always due: the 1st of last month and the 1st of this month
  const thisMonth = currentMonth();
  const lastMonth = shiftMonth(thisMonth, -1);
  const nextRun = formatDate(fromDateInput(`${shiftMonth(thisMonth, 1)}-01`));

  // 1. An empty page, opened from the menu
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Recurring' }).click();
  await expect(page.getByRole('heading', { name: 'Recurring', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No recurring rules yet' })).toBeVisible();

  // 2. Add the rule
  await page.getByRole('button', { name: 'Add rule' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add rule' });
  await dialog.getByLabel('Amount').fill('3500000');
  await dialog.getByRole('button', { name: 'Bills' }).click();
  await dialog.getByLabel('Start date').fill(`${lastMonth}-01`);
  await dialog.getByLabel('Note').fill('Rent');
  await dialog.getByRole('button', { name: 'Save rule' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Rule added')).toBeVisible();

  // 3. The list shows it; both due runs are done, so the next run is the 1st of next month
  const row = page.getByRole('listitem').filter({ hasText: 'Rent' });
  await expect(row.getByText('Bills')).toBeVisible();
  await expect(row.getByText(/^−3\.500\.000\s₫$/)).toBeVisible();
  await expect(row.getByText('Monthly')).toBeVisible();
  await expect(row.getByText(nextRun)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Active: Rent' })).toBeChecked();

  // 4. This month has one transaction with the label
  await page.goto('/transactions');
  await expect(page.getByText(/· 1 transaction$/)).toBeVisible();
  await expect(recurringLabels(page)).toHaveCount(1);

  // 5. So has last month. Loading the page again creates no duplicate.
  await page.goto(`/transactions?month=${lastMonth}`);
  await expect(page.getByText(/· 1 transaction$/)).toBeVisible();
  await expect(recurringLabels(page)).toHaveCount(1);
  await page.reload();
  await expect(page.getByText(/· 1 transaction$/)).toBeVisible();

  // 6. A transaction added by hand has no label
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const addDialog = page.getByRole('dialog', { name: 'Add transaction' });
  await addDialog.getByLabel('Amount').fill('50000');
  await addDialog.getByRole('button', { name: 'Food' }).click();
  await addDialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(addDialog).toBeHidden();
  await expect(page.getByText(/· 2 transactions$/)).toBeVisible();
  await expect(recurringLabels(page)).toHaveCount(1);
});

test('turn a rule off and on, edit it, then delete it and keep its transactions', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'manage');
  const lastMonth = shiftMonth(currentMonth(), -1);

  await page.goto('/recurring');
  await page.getByRole('button', { name: 'Add rule' }).first().click();
  const addDialog = page.getByRole('dialog', { name: 'Add rule' });

  // The form explains itself when something is missing
  await addDialog.getByRole('button', { name: 'Save rule' }).click();
  await expect(addDialog.getByText('Please enter an amount greater than 0.')).toBeVisible();

  await addDialog.getByLabel('Amount').fill('200000');
  await addDialog.getByRole('button', { name: 'Income' }).click();
  await addDialog.getByRole('button', { name: 'Salary' }).click();
  await addDialog.getByLabel('Start date').fill(`${lastMonth}-01`);
  await addDialog.getByLabel('Note').fill('Side job');
  await addDialog.getByRole('button', { name: 'Save rule' }).click();
  await expect(addDialog).toBeHidden();

  // 1. Off and on again
  const toggle = page.getByRole('switch', { name: 'Active: Side job' });
  await toggle.click();
  await expect(page.getByText('Rule turned off')).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByRole('listitem').filter({ hasText: 'Side job' }).getByText('Paused')).toBeVisible();
  await toggle.click();
  await expect(page.getByText('Rule turned on')).toBeVisible();
  await expect(toggle).toBeChecked();

  // 2. Edit: the form starts from the rule
  await page.getByRole('button', { name: 'Edit Side job' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit rule' });
  await expect(editDialog.getByLabel('Start date')).toHaveValue(`${lastMonth}-01`);
  await editDialog.getByLabel('Note').fill('Freelance');
  await editDialog.getByRole('button', { name: 'Weekly' }).click();
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText('Rule updated')).toBeVisible();
  const row = page.getByRole('listitem').filter({ hasText: 'Freelance' });
  await expect(row.getByText('Weekly')).toBeVisible();

  // 3. Delete asks first and says what happens to the transactions: Cancel keeps it, Delete removes it
  await page.getByRole('button', { name: 'Delete Freelance' }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Delete this rule?' });
  await expect(deleteDialog.getByText('Transactions already created will be kept')).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: 'Delete Freelance' }).click();
  await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Rule deleted')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No recurring rules yet' })).toBeVisible();

  // 4. The transactions it created are still there
  await page.goto(`/transactions?month=${lastMonth}`);
  await expect(recurringLabels(page).first()).toBeVisible();
});

test('a category with a rule cannot be deleted', async ({ page }, testInfo) => {
  await register(page, testInfo, 'category');

  // A rule that starts next year creates no transactions, so only the rule blocks the delete
  await page.goto('/recurring');
  await page.getByRole('button', { name: 'Add rule' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add rule' });
  await dialog.getByLabel('Amount').fill('100000');
  await dialog.getByRole('button', { name: 'Shopping' }).click();
  await dialog.getByLabel('Start date').fill(`${Number(currentMonth().slice(0, 4)) + 1}-01-15`);
  await dialog.getByRole('button', { name: 'Save rule' }).click();
  await expect(dialog).toBeHidden();

  await page.goto('/categories');
  await page.getByRole('button', { name: /Delete.*Shopping/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Category still has recurring rules')).toBeVisible();
});
