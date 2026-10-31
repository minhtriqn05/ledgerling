import { expect, test } from '@playwright/test';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

test('register → add a transaction → see it everywhere → log out', async ({ page }, testInfo) => {
  // A new account for every run and every project (desktop / mobile)
  const email = `e2e-${testInfo.project.name}-${Date.now()}@example.com`;

  // 1. Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // 2. The new account lands on an empty Dashboard
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^No transactions in / })).toBeVisible();

  // 3. Add an expense on the Transactions page
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Transactions' }).click();
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Add transaction' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount').fill('185000');
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByLabel('Note').fill('Lunch e2e');
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();

  // 4. It is in the list (a table on desktop, a list on phones: only one of them is visible)
  await expect(page.getByText('Lunch e2e').filter({ visible: true })).toBeVisible();
  // The header subtitle counts it: "October 2026 · 1 transaction"
  await expect(page.getByText(/· 1 transaction$/)).toBeVisible();

  // 5. The Dashboard numbers changed
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Dashboard' }).click();
  const expenseCard = page.locator('article', { hasText: 'Total Expense' });
  await expect(expenseCard).toContainText('185,000');
  await expect(page.locator('article', { hasText: 'Balance' })).toContainText('185,000');

  // 6. Log out: a visitor on "/" lands on the landing page, and any other protected page sends us to the login page
  await openMenuIfNeeded(page);
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/welcome$/);

  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
