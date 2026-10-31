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
  await page.getByLabel('Name').fill('Report Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// A day in Vietnam time: 0 = today
function today() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

// Adds transactions through the API: [{ category: 'Food', amount, date: ISO text, note }]
async function seed(page, rows) {
  const categories = await apiCall(page, 'GET', '/categories');
  for (const row of rows) {
    const category = categories.find((c) => c.name === row.category);
    await apiCall(page, 'POST', '/transactions', {
      categoryId: category._id,
      amount: row.amount,
      date: row.date,
      note: row.note ?? '',
    });
  }
}

// The numbers worked out by hand (all in 2025, so they never change with the date of the test run):
//   September 2025: income 10,000,000 · expense 800,000
//   October 2025:   income 12,000,000 · expense 1,000,000 (10 Oct, "Big dinner") + 50,000 (23:30 on 31 Oct, "Taxi late")
//                   = 1,050,000 · balance 10,950,000
//   changes: income +20%, expense (1.05M - 0.8M) / 0.8M = +31.3%, balance (10.95M - 9.2M) / 9.2M = +19%
//   the year 2025: income 22,000,000 · expense 1,850,000 · balance 20,150,000 · highest-spending month: October
const OCTOBER = [
  { category: 'Salary', amount: 10000000, date: '2025-09-01T08:00:00+07:00', note: 'September salary' },
  { category: 'Food', amount: 800000, date: '2025-09-10T12:00:00+07:00', note: 'September food' },
  { category: 'Salary', amount: 12000000, date: '2025-10-01T08:00:00+07:00', note: 'October salary' },
  { category: 'Food', amount: 1000000, date: '2025-10-10T19:00:00+07:00', note: 'Big dinner' },
  { category: 'Transport', amount: 50000, date: '2025-10-31T23:30:00+07:00', note: 'Taxi late' },
];

test('open Reports, switch the three tabs, click a day in the calendar and land on that day in Transactions', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'tabs');
  await seed(page, OCTOBER);

  // 1. Reports is in the menu; a month without data shows an empty state, not an error
  await openMenuIfNeeded(page);
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  await page.goto('/reports?month=2025-02');
  await expect(page.getByRole('heading', { name: 'No transactions in February 2025' })).toBeVisible();

  // 2. Monthly: the numbers match the hand-made ones, with the change from September
  await page.goto('/reports?month=2025-10');
  await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');
  const totals = page.getByRole('region', { name: 'Totals for October 2025' });
  await expect(totals.getByText(/^12,000,000\s₫$/)).toBeVisible();
  await expect(totals.getByText(/^1,050,000\s₫$/)).toBeVisible();
  await expect(totals.getByText(/^10,950,000\s₫$/)).toBeVisible();
  await expect(totals.getByText('Up 20% from last month')).toBeAttached();
  await expect(totals.getByText('Up 31.3% from last month')).toBeAttached();
  await expect(totals.getByText('Up 19% from last month')).toBeAttached();

  const facts = page.getByRole('region', { name: 'Quick facts' });
  // 1,050,000 / 31 days = 33,870,97 -> 33,871; 3 days have an expense... 10 Oct and 31 Oct -> 29 days without one
  await expect(facts.getByText(/^33,871\s₫$/)).toBeVisible();
  await expect(facts.getByText('29', { exact: true })).toBeVisible();
  await expect(facts.getByText(/^1,000,000\s₫$/)).toBeVisible();
  await expect(facts.getByText(/Food · 10 Oct 2025 · Big dinner/)).toBeVisible();

  // The category table and the insights card
  const foodRow = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Food' }) });
  await expect(foodRow.getByText(/^1,000,000\s₫$/)).toBeVisible();
  // The Share column is left out on a phone to make room
  if (testInfo.project.name === 'desktop') await expect(foodRow.getByText('95.2%')).toBeVisible();
  else await expect(foodRow.getByText('95.2%')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Your largest expense was 1,000,000\s₫ on Food \(10 Oct\)/ })).toBeVisible();

  // 3. Yearly
  await page.getByRole('tab', { name: 'Yearly' }).click();
  await expect(page).toHaveURL(/tab=yearly/);
  await expect(page.getByRole('tab', { name: 'Yearly' })).toHaveAttribute('aria-selected', 'true');
  const yearTotals = page.getByRole('region', { name: 'Totals for 2025' });
  await expect(yearTotals.getByText(/^22,000,000\s₫$/)).toBeVisible();
  await expect(yearTotals.getByText(/^1,850,000\s₫$/)).toBeVisible();
  await expect(yearTotals.getByText(/^20,150,000\s₫$/)).toBeVisible();
  await expect(page.getByText('Highest-spending month:').locator('..')).toContainText('October');
  // The year picker moves to an empty year
  await page.getByRole('button', { name: 'Previous year' }).click();
  await expect(page.getByRole('heading', { name: 'No transactions in 2024' })).toBeVisible();
  await page.getByRole('button', { name: 'Next year' }).click();
  await expect(yearTotals).toBeVisible();

  // 4. Calendar: the month is the same one as on the Monthly tab
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page).toHaveURL(/tab=calendar/);
  await expect(page).toHaveURL(/month=2025-10/);
  await expect(page.getByText(/Spent this month:/)).toContainText('1,050,000');
  // 1 Oct 2025 is a Wednesday, so Mon and Tue come before it; the grid starts on Monday
  const weekdayNames = await page.locator('[aria-label="Calendar of October 2025"] > span[aria-hidden="true"]').allTextContents();
  expect(weekdayNames.slice(0, 7)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  // 31 days, each one a button
  await expect(page.getByRole('button', { name: /^\d+ October 2025:/ })).toHaveCount(31);
  await expect(page.getByRole('button', { name: /^1 October 2025: no spending/ })).toBeVisible();

  // 5. A click on a day opens Transactions filtered to exactly that day
  await page.getByRole('button', { name: /^10 October 2025: spent 1,000,000\s₫/ }).click();
  await expect(page).toHaveURL(/\/transactions\?from=2025-10-10&to=2025-10-10$/);
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  await expect(page.getByText('1 transaction', { exact: true })).toBeVisible();
  await expect(page.getByText('Big dinner').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Taxi late')).toHaveCount(0);
  await expect(page.getByText('October salary')).toHaveCount(0);

  // 6. The 23:30 expense on the last day of the month is on 31 October, not on 1 November
  await page.goto('/reports?tab=calendar&month=2025-10');
  await page.getByRole('button', { name: /^31 October 2025: spent 50,000\s₫/ }).click();
  await expect(page).toHaveURL(/from=2025-10-31&to=2025-10-31/);
  await expect(page.getByText('Taxi late').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('1 transaction', { exact: true })).toBeVisible();
});

test('the Dashboard shows an Insights card whose tips open the matching page', async ({ page }, testInfo) => {
  await register(page, testInfo, 'insights');
  // One expense today, so the Dashboard has data and the insights have something to say
  await seed(page, [{ category: 'Food', amount: 45000, date: `${today()}T12:00:00+07:00`, note: 'Lunch today' }]);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
  const tip = page.getByRole('link', { name: /Your largest expense was 45,000\s₫ on Food/ });
  await expect(tip).toBeVisible();

  await tip.click();
  await expect(page).toHaveURL(new RegExp(`/transactions\\?from=${today()}&to=${today()}$`));
  await expect(page.getByText('Lunch today').filter({ visible: true })).toBeVisible();
});

test('the Print button opens the print dialog of the browser', async ({ page }, testInfo) => {
  await register(page, testInfo, 'print');
  await page.goto('/reports');

  // window.print() would block a headless browser, so replace it with a counter
  await page.evaluate(() => {
    window.printCalls = 0;
    window.print = () => {
      window.printCalls += 1;
    };
  });
  await page.getByRole('button', { name: 'Print' }).click();
  expect(await page.evaluate(() => window.printCalls)).toBe(1);

  // In the print layout the sidebar and the controls are gone, the report stays
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(page.getByRole('tablist')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
});
