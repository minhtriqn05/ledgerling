import { expect, test } from '@playwright/test';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Budget Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Adds an expense in the Food category (today, so it falls in the month the pages open on).
async function addFoodExpense(page, amount) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount').fill(String(amount));
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
}

// Creates a budget in the month on screen on the Budgets page.
async function addBudget(page, categoryName, amount) {
  await page.getByRole('button', { name: 'Add budget' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add budget' });
  await dialog.getByRole('button', { name: categoryName }).click();
  await dialog.getByLabel('Monthly limit').fill(String(amount));
  await dialog.getByRole('button', { name: 'Save budget' }).click();
  await expect(dialog).toBeHidden();
}

// The real color of a design token (tokens.css), as the browser computes it: "rgb(37, 163, 122)".
// The bar must use exactly these, so the test never hardcodes a color.
function tokenColor(page, token) {
  return page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

// The progress bar and its colored fill for one category on the Budgets page
function progressOf(page, categoryName) {
  const track = page.getByRole('progressbar', { name: categoryName });
  return { track, fill: track.locator('span') };
}

test('set a limit → spend past 80% and 100% → the bar and the Dashboard alert change', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await register(page, testInfo, 'limit');

  const green = await tokenColor(page, '--color-income');
  const yellow = await tokenColor(page, '--accent-sun');
  const red = await tokenColor(page, '--color-expense');

  // 1. An empty Budgets page, opened from the menu
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Budgets' }).click();
  await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^No budgets in / })).toBeVisible();

  // 2. Only expense categories can get a budget
  await page.getByRole('button', { name: 'Add budget' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add budget' });
  await expect(dialog.getByRole('button', { name: 'Food' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Salary' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  // 3. A limit of 1.000.000 ₫ for Food, nothing spent yet: green bar
  await addBudget(page, 'Food', 1000000);
  await expect(page.getByText('Budget added')).toBeVisible();
  let { track, fill } = progressOf(page, 'Food');
  await expect(track).toHaveAttribute('aria-valuetext', '0% used');
  await expect(page.getByText(/^1\.000\.000\s₫ left$/)).toBeVisible();
  await expect(fill).toHaveCSS('background-color', green);

  // 4. 70% used: still green, and the Dashboard says everything is fine
  await addFoodExpense(page, 700000);
  await page.goto('/budgets');
  ({ track, fill } = progressOf(page, 'Food'));
  await expect(track).toHaveAttribute('aria-valuetext', '70% used');
  await expect(fill).toHaveCSS('background-color', green);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Budget alerts' })).toBeVisible();
  await expect(page.getByText('All budgets on track')).toBeVisible();

  // 5. Exactly 80% (700.000 + 100.000 of 1.000.000): the bar turns yellow and the Dashboard warns
  await addFoodExpense(page, 100000);
  await page.goto('/budgets');
  ({ track, fill } = progressOf(page, 'Food'));
  await expect(track).toHaveAttribute('aria-valuetext', '80% used');
  await expect(fill).toHaveCSS('background-color', yellow);
  await expect(page.getByText(/^200\.000\s₫ left$/)).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('All budgets on track')).toHaveCount(0);
  const warning = page.getByRole('listitem').filter({ hasText: /Food.*200\.000\s₫ left.*80%/ });
  await expect(warning).toBeVisible();

  // 6. Exactly 100%: the bar turns red
  await addFoodExpense(page, 200000);
  await page.goto('/budgets');
  ({ track, fill } = progressOf(page, 'Food'));
  await expect(track).toHaveAttribute('aria-valuetext', '100% used');
  await expect(fill).toHaveCSS('background-color', red);

  await page.goto('/');
  await expect(page.getByRole('listitem').filter({ hasText: /Food.*Limit reached.*100%/ })).toBeVisible();

  // 7. Past the limit: "Over by" on both pages
  await addFoodExpense(page, 50000);
  await page.goto('/budgets');
  await expect(page.getByText(/^Over by 50\.000\s₫$/)).toBeVisible();
  await expect(progressOf(page, 'Food').track).toHaveAttribute('aria-valuetext', '105% used');

  await page.goto('/');
  await expect(page.getByRole('listitem').filter({ hasText: /Food.*Over by 50\.000\s₫.*105%/ })).toBeVisible();

  // 8. "Manage budgets" goes to the Budgets page
  await page.getByRole('button', { name: 'Manage budgets' }).click();
  await expect(page).toHaveURL(/\/budgets$/);
});

test('Dashboard invites a new user to create a budget', async ({ page }, testInfo) => {
  await register(page, testInfo, 'invite');
  // The Dashboard needs a transaction before it shows its cards
  await addFoodExpense(page, 50000);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Budget alerts' })).toBeVisible();
  await expect(page.getByText(/^No budgets in .* yet/)).toBeVisible();
  await page.getByRole('button', { name: 'Create a budget' }).click();
  await expect(page).toHaveURL(/\/budgets$/);
});

test('copy from last month → edit → delete with confirmation', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'copy');
  await page.goto('/budgets');

  // 1. Two budgets in the current month
  await addBudget(page, 'Food', 500000);
  await addBudget(page, 'Transport', 300000);
  await expect(page.getByRole('progressbar')).toHaveCount(2);

  // 2. Next month is empty: copy last month's budgets into it
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('heading', { name: /^No budgets in / })).toBeVisible();
  await page.getByRole('button', { name: 'Copy from last month' }).click();
  await expect(page.getByText('2 budgets copied')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(2);
  await expect(page.getByText(/^500\.000\s₫ left$/)).toBeVisible();

  // 3. Edit Food: the category is fixed, only the limit changes
  await page.getByRole('button', { name: 'Edit the Food budget' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit budget' });
  await editDialog.getByLabel('Monthly limit').fill('800000');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText('Budget updated')).toBeVisible();
  await expect(page.getByText(/^800\.000\s₫ left$/)).toBeVisible();

  // 4. The dialog only offers expense categories that have no budget in this month yet
  await page.getByRole('button', { name: 'Add budget' }).first().click();
  const addDialog = page.getByRole('dialog', { name: 'Add budget' });
  await expect(addDialog.getByRole('button', { name: 'Shopping' })).toBeVisible();
  await expect(addDialog.getByRole('button', { name: 'Food' })).toHaveCount(0);
  await expect(addDialog.getByRole('button', { name: 'Transport' })).toHaveCount(0);
  await addDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(addDialog).toBeHidden();

  // 5. Delete asks first: Cancel keeps it, Delete removes it
  await page.getByRole('button', { name: 'Delete the Food budget' }).click();
  await expect(page.getByText('Delete the "Food" budget?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('progressbar', { name: 'Food' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete the Food budget' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Budget deleted')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Food' })).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: 'Transport' })).toBeVisible();

  // 6. Last month still has its own two budgets
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('progressbar')).toHaveCount(2);
});
