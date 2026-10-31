import { expect, test } from '@playwright/test';

// The API started by playwright.config.js (in-memory database)
const API_URL = 'http://localhost:4100/api';

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Notification Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
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

// Adds an expense in the Food category (today, so it falls in the month the budget is in).
async function addFoodExpense(page, amount) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount').fill(String(amount));
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
}

// Creates a budget in the current month on the Budgets page.
async function addFoodBudget(page, amount) {
  await page.goto('/budgets');
  await page.getByRole('button', { name: 'Add budget' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add budget' });
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByLabel('Monthly limit').fill(String(amount));
  await dialog.getByRole('button', { name: 'Save budget' }).click();
  await expect(dialog).toBeHidden();
}

// How many notifications the server counts as unread. Unlike the bell this is never half loaded, so a test that
// expects "nothing" cannot pass just because the answer has not arrived yet.
async function unreadOnServer(page) {
  return (await apiCall(page, 'GET', '/notifications/unread-count')).count;
}

// The bell. Its name says how many notifications are unread: "Notifications, 2 unread", or just "Notifications".
const bell = (page, unread) =>
  page.getByRole('button', { name: unread === undefined ? 'Notifications' : `Notifications, ${unread} unread`, exact: true });

test('budget passes 80% → the bell shows 1 → open it → mark as read; each level notifies only once', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await register(page, testInfo, 'bell');
  await expect(bell(page)).toBeVisible();

  // 1. A limit of 1,000,000 ₫ for Food. 700,000 is 70%: nothing to say yet.
  await addFoodBudget(page, 1000000);
  await addFoodExpense(page, 700000);
  await page.goto('/');
  await expect(bell(page)).toBeVisible();

  // 2. 100,000 more is exactly 80%: the bell shows 1 right after saving, without a reload
  await addFoodExpense(page, 100000);
  await expect(bell(page, 1)).toBeVisible();

  // 3. Open it: the warning is first, in plain words
  await bell(page, 1).click();
  const dropdown = page.getByRole('dialog', { name: 'Notifications' });
  await expect(dropdown.getByText('Budget warning: Food')).toBeVisible();
  await expect(dropdown.getByText(/Food has used 80% of its .* budget/)).toBeVisible();
  await expect(dropdown.getByText('Just now').first()).toBeVisible();

  // 4. Opening the list made this week's summary (the user has transactions), so there are 2 unread now
  await expect(dropdown.getByText('Your week in numbers')).toBeVisible();
  await expect(bell(page, 2)).toBeVisible();

  // 5. Mark all as read: the badge goes away
  await dropdown.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(bell(page)).toBeVisible();
  await expect(dropdown.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dropdown).toBeHidden();

  // 6. More spending below 100% does not notify again (80% was already reported)
  await addFoodExpense(page, 50000);
  expect(await unreadOnServer(page)).toBe(0);
  await page.reload();
  await expect(bell(page)).toBeVisible();

  // 7. Passing 100% (850,000 + 200,000) notifies once, and more spending after that does not
  await addFoodExpense(page, 200000);
  await expect(bell(page, 1)).toBeVisible();
  await addFoodExpense(page, 20000);
  expect(await unreadOnServer(page)).toBe(1);
  await page.reload();
  await expect(bell(page, 1)).toBeVisible();

  // 8. Click the notification: it goes to the Budgets page of that month and is marked as read
  await bell(page, 1).click();
  await page.getByRole('dialog', { name: 'Notifications' }).getByRole('button', { name: /Over budget: Food/ }).click();
  await expect(page).toHaveURL(/\/budgets\?month=\d{4}-\d{2}$/);
  await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Food' })).toBeVisible();
  await expect(bell(page)).toBeVisible();
  await page.reload();
  await expect(bell(page)).toBeVisible();
});

test('a switch that is off creates no notification of that kind', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await register(page, testInfo, 'switch');

  // 1. The Notifications page is empty for a new account; the switches are in Settings
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: "You're all caught up" })).toBeVisible();
  await page.getByRole('button', { name: 'Notification settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const budgetSwitch = page.getByRole('checkbox', { name: /^Budgets/ });
  await expect(budgetSwitch).toBeChecked();

  // 2. Turn Budgets off
  await budgetSwitch.uncheck();
  await expect(page.getByText('Settings saved')).toBeVisible();
  await expect(budgetSwitch).not.toBeChecked();

  // 3. Spending 90% of a budget now says nothing, even after a reload
  await addFoodBudget(page, 1000000);
  await addFoodExpense(page, 900000);
  expect(await unreadOnServer(page)).toBe(0);
  await page.reload();
  await expect(bell(page)).toBeVisible();

  // 4. The choice is kept after a reload; turn Budgets on again. The Notifications page is opened first: listing
  //    the notifications is what makes this week's summary.
  await page.goto('/notifications');
  await expect(page.getByText('Your week in numbers')).toBeVisible();
  await page.goto('/settings/notifications');
  await expect(budgetSwitch).not.toBeChecked();
  await budgetSwitch.check();
  await expect(budgetSwitch).toBeChecked();

  // 5. Now the next expense reports the level that is already passed. The bell says 2: opening the Notifications
  //    page in step 4 listed them, which made this week's summary (the user had transactions by then).
  await addFoodExpense(page, 10000);
  await expect(bell(page, 2)).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Budget warning: Food')).toBeVisible();
  await expect(page.getByText('Your week in numbers')).toBeVisible();
});

test('the Notifications page: pages of 10, unread filter, open, delete, mark all as read', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await register(page, testInfo, 'page');

  // 12 goals that are reached right away make 12 notifications
  for (let n = 1; n <= 12; n += 1) {
    const goal = await apiCall(page, 'POST', '/goals', { name: `Goal ${n}`, targetAmount: 1000, color: '#4A9FE3' });
    await apiCall(page, 'POST', `/goals/${goal._id}/contributions`, { amount: 1000 });
  }

  // 1. Newest first, 10 per page
  await page.goto('/notifications');
  await expect(page.getByText('12 notifications')).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.getByText(/^Goal reached: Goal \d+$/)).toHaveCount(10);
  await expect(page.getByText('Goal reached: Goal 12')).toBeVisible();
  await expect(page.getByText('12 unread')).toBeVisible();
  await expect(bell(page, 12)).toBeVisible();

  // 2. The second page has the 2 oldest
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByText(/^Goal reached: Goal \d+$/)).toHaveCount(2);
  await expect(page.getByText('Goal reached: Goal 1', { exact: true })).toBeVisible();

  // 3. Open one: it goes to its link and counts down
  await page.getByRole('button', { name: /Goal reached: Goal 1 / }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(bell(page, 11)).toBeVisible();

  // 4. Delete one (an unread one) with the trash button
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Delete notification: Goal reached: Goal 12' }).click();
  await expect(page.getByText('Notification deleted')).toBeVisible();
  await expect(page.getByText('11 notifications')).toBeVisible();
  await expect(bell(page, 10)).toBeVisible();

  // 5. Mark all as read, then the Unread filter has nothing
  await page.getByRole('button', { name: 'Mark all as read' }).first().click();
  await expect(page.getByText('All notifications marked as read')).toBeVisible();
  await expect(bell(page)).toBeVisible();
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No unread notifications' })).toBeVisible();

  // 6. All shows them again
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByText('11 notifications')).toBeVisible();
});
