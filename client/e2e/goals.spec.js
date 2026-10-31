import { expect, test } from '@playwright/test';

// The API started by playwright.config.js (in-memory database)
const API_URL = 'http://localhost:4100/api';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Goal Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// A day in Vietnam time: 0 = today, 30 = in 30 days
function dayFromToday(offset) {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Calls the API as the signed-in user, for the setup that is not what the test is about
async function apiCall(page, method, path, data) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.fetch(`${API_URL}${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}

// Creates a goal on the Goals page
async function addGoal(page, { name, target, deadline }) {
  await page.getByRole('button', { name: 'New goal' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New goal' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Target amount').fill(String(target));
  if (deadline) await dialog.getByLabel('Deadline (optional)').fill(deadline);
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  await expect(dialog).toBeHidden();
}

// The card of one goal (each card is a list item)
const cardOf = (page, name) => page.locator('main').getByRole('listitem').filter({ has: page.getByRole('heading', { name }) });

// Adds (or withdraws) money in the dialog opened from the card
async function moveMoney(page, name, { mode, amount, note }) {
  const card = cardOf(page, name);
  await card.getByRole('button', { name: mode === 'add' ? 'Add money' : 'Withdraw', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: mode === 'add' ? 'Add money' : 'Withdraw money' });
  await dialog.getByLabel('Amount').fill(String(amount));
  if (note) await dialog.getByLabel('Note').fill(note);
  await dialog.getByRole('button', { name: mode === 'add' ? 'Add to goal' : 'Withdraw from goal' }).click();
  await expect(dialog).toBeHidden();
}

test('create a goal → add money → the progress grows → saving the rest shows Completed', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'flow');

  // 1. An empty page, opened from the menu
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Goals' }).click();
  await expect(page.getByRole('heading', { name: 'Goals', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No savings goals yet' })).toBeVisible();

  // 2. The form explains itself when something is missing
  await page.getByRole('button', { name: 'New goal' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New goal' });
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  await expect(dialog.getByText('Please enter a name.')).toBeVisible();
  await dialog.getByLabel('Name').fill('Laptop');
  await dialog.getByLabel('Target amount').fill('1000000');
  await dialog.getByLabel('Deadline (optional)').fill(dayFromToday(0));
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  await expect(dialog.getByText('The deadline must be after today.')).toBeVisible();

  // 3. A valid goal: it starts at 0% with the deadline, the days left and the monthly line
  await dialog.getByLabel('Deadline (optional)').fill(dayFromToday(45));
  await dialog.getByRole('button', { name: 'Save goal' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Goal added')).toBeVisible();

  const card = cardOf(page, 'Laptop');
  const bar = card.getByRole('progressbar');
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  await expect(card.getByText(/1,000,000\s₫ to go/)).toBeVisible();
  await expect(card.getByText('45 days left')).toBeVisible();
  // 45 days = 2 months → 500,000 a month
  await expect(card.getByText(/Save 500,000\s₫ per month to reach it/)).toBeVisible();
  await expect(card.getByText('Completed', { exact: true })).toBeHidden();
  // Nothing saved yet, nothing to withdraw
  await expect(card.getByRole('button', { name: 'Withdraw', exact: true })).toBeDisabled();

  // 4. Add money: the bar and the numbers follow
  await moveMoney(page, 'Laptop', { mode: 'add', amount: 400000, note: 'Bonus' });
  await expect(page.getByText('Money added')).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '40');
  await expect(card.getByText(/600,000\s₫ to go/)).toBeVisible();
  await expect(card.getByText('40%')).toBeVisible();
  // 600,000 left, 2 months → 300,000 a month
  await expect(card.getByText(/Save 300,000\s₫ per month to reach it/)).toBeVisible();

  // 5. Take some out: the bar goes down
  await moveMoney(page, 'Laptop', { mode: 'withdraw', amount: 100000 });
  await expect(page.getByText('Money withdrawn')).toBeVisible();
  await expect(bar).toHaveAttribute('aria-valuenow', '30');

  // 6. Save the rest: Completed, a full bar, and the goal stays after a reload
  await moveMoney(page, 'Laptop', { mode: 'add', amount: 700000 });
  await expect(bar).toHaveAttribute('aria-valuenow', '100');
  await expect(card.getByText('Completed', { exact: true })).toBeVisible();
  await expect(card.getByText('Goal reached')).toBeVisible();
  await expect(card.getByText(/per month/)).toBeHidden();
  await page.reload();
  await expect(cardOf(page, 'Laptop').getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText(/^1 goal · 1 completed$/)).toBeVisible();
});

test('a withdrawal cannot be bigger than the saved money, and a mistake can be deleted from the history', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'history');

  await page.goto('/goals');
  await addGoal(page, { name: 'Trip', target: 2000000 });
  const card = cardOf(page, 'Trip');

  await moveMoney(page, 'Trip', { mode: 'add', amount: 500000, note: 'Gift' });
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

  // 1. Asking for more than is saved is refused in the dialog, and nothing changes
  await card.getByRole('button', { name: 'Withdraw', exact: true }).click();
  const withdrawDialog = page.getByRole('dialog', { name: 'Withdraw money' });
  await withdrawDialog.getByLabel('Amount').fill('600000');
  await withdrawDialog.getByRole('button', { name: 'Withdraw from goal' }).click();
  await expect(withdrawDialog.getByText(/You can withdraw at most 500,000\s₫/)).toBeVisible();
  await withdrawDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

  // 2. Take 400,000 out; the history lists both entries, newest first
  await moveMoney(page, 'Trip', { mode: 'withdraw', amount: 400000 });
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await card.getByRole('button', { name: 'History of Trip' }).click();
  const history = page.getByRole('dialog', { name: /History/ });
  await expect(history.getByText(/100,000\s₫ saved of 2,000,000\s₫/)).toBeVisible();
  const rows = history.getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Withdrawal');
  await expect(rows.first()).toContainText(/−400,000\s₫/);
  await expect(rows.last()).toContainText('Deposit');
  await expect(rows.last()).toContainText('Gift');

  // 3. The deposit was spent by the withdrawal: deleting it is refused
  await history.getByRole('button', { name: /Delete deposit of 500,000/ }).click();
  await expect(page.getByText('Deleting this deposit would make the saved amount negative')).toBeVisible();
  await expect(rows).toHaveCount(2);

  // 4. Deleting the withdrawal puts the money back; then the deposit can go too
  await history.getByRole('button', { name: /Delete withdrawal of 400,000/ }).click();
  await expect(page.getByText('Entry deleted')).toBeVisible();
  await expect(history.getByText(/500,000\s₫ saved of 2,000,000\s₫/)).toBeVisible();
  await expect(rows).toHaveCount(1);
  await history.getByRole('button', { name: /Delete deposit of 500,000/ }).click();
  await expect(history.getByText('No money added yet. Use Add money to start saving.')).toBeVisible();

  // 5. The card behind shows the new numbers
  await history.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(history).toBeHidden();
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(card.getByRole('button', { name: 'Withdraw', exact: true })).toBeDisabled();
});

test('edit a goal, see completed goals move to the end, then delete a goal', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'manage');

  await page.goto('/goals');
  await addGoal(page, { name: 'Phone', target: 800000, deadline: dayFromToday(20) });
  await addGoal(page, { name: 'Bike', target: 3000000, deadline: dayFromToday(90) });

  // 1. The nearest deadline comes first
  const names = page.locator('main').getByRole('heading', { level: 2 });
  await expect(names).toHaveText(['Phone', 'Bike']);

  // 2. Edit: the form starts from the goal; the saved amount is not part of it
  await cardOf(page, 'Bike').getByRole('button', { name: 'Edit Bike' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit goal' });
  await expect(editDialog.getByLabel('Name')).toHaveValue('Bike');
  await expect(editDialog.getByLabel('Target amount')).toHaveValue('3,000,000');
  await expect(editDialog.getByLabel('Deadline (optional)')).toHaveValue(dayFromToday(90));
  await editDialog.getByLabel('Name').fill('Electric bike');
  await editDialog.getByLabel('Target amount').fill('4000000');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText('Goal updated')).toBeVisible();
  await expect(cardOf(page, 'Electric bike').getByText(/\/ 4,000,000\s₫$/)).toBeVisible();

  // 3. Completing the first goal moves it to the end of the list
  await moveMoney(page, 'Phone', { mode: 'add', amount: 800000 });
  await expect(cardOf(page, 'Phone').getByText('Completed', { exact: true })).toBeVisible();
  await expect(names).toHaveText(['Electric bike', 'Phone']);

  // 4. Delete asks first and says what happens to the history: Cancel keeps it, Delete removes it
  await cardOf(page, 'Electric bike').getByRole('button', { name: 'Delete Electric bike' }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Delete this goal?' });
  await expect(deleteDialog.getByText(/history of added and withdrawn money will be deleted/)).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(cardOf(page, 'Electric bike')).toBeVisible();

  await cardOf(page, 'Electric bike').getByRole('button', { name: 'Delete Electric bike' }).click();
  await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Goal deleted')).toBeVisible();
  await expect(names).toHaveText(['Phone']);
});

test('the Dashboard shows the 2 unfinished goals with the nearest deadlines', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'dashboard');

  // The Dashboard only shows its cards when the month has a transaction
  const categories = await apiCall(page, 'GET', '/categories');
  const food = categories.find((c) => c.name === 'Food');
  await apiCall(page, 'POST', '/transactions', { categoryId: food._id, amount: 50000 });

  const goalInput = (name, days) => ({ name, targetAmount: 1000000, deadline: dayFromToday(days), color: '#4A9FE3' });
  await apiCall(page, 'POST', '/goals', goalInput('Far away', 120));
  const middle = await apiCall(page, 'POST', '/goals', goalInput('Middle', 60));
  await apiCall(page, 'POST', '/goals', goalInput('Soon', 10));
  const done = await apiCall(page, 'POST', '/goals', goalInput('Already done', 5));
  await apiCall(page, 'POST', `/goals/${done._id}/contributions`, { amount: 1000000 });
  await apiCall(page, 'POST', `/goals/${middle._id}/contributions`, { amount: 250000 });

  await page.goto('/');
  // The row with the budget alerts and the savings goals (the budget card has no progress bar without budgets)
  const cards = page.locator('main section', { has: page.getByRole('heading', { name: 'Savings goals' }) });
  const soon = cards.getByRole('progressbar', { name: 'Soon' });
  await expect(soon).toBeVisible();
  await expect(soon).toHaveAttribute('aria-valuenow', '0');
  await expect(cards.getByRole('progressbar', { name: 'Middle' })).toHaveAttribute('aria-valuenow', '25');
  await expect(cards.getByText('10 days left')).toBeVisible();
  // Only 2 goals, and not the completed one
  await expect(cards.getByRole('progressbar')).toHaveCount(2);
  await expect(cards.getByText('Far away')).toBeHidden();
  await expect(cards.getByText('Already done')).toBeHidden();

  // "View all" opens the Goals page
  await cards.getByRole('button', { name: 'View all' }).click();
  await expect(page.getByRole('heading', { name: 'Goals', level: 1 })).toBeVisible();
  await expect(page.locator('main').getByRole('heading', { level: 2 })).toHaveText(['Soon', 'Middle', 'Far away', 'Already done']);
});
