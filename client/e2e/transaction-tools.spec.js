import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { chooseOption } from './helpers/controls.js';

// The API Playwright starts (see playwright.config.js). Used to put data in quickly, so each test only
// clicks through the part it is about.
const API_URL = 'http://localhost:4100/api';

// A new account for every test and every project (desktop / mobile). Ends on the Dashboard.
async function register(page, testInfo, label) {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Tools Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Creates transactions through the API for the signed-in user. rows: [{ category: 'Food', amount, note, tags }]
async function seed(page, rows) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
  const idOf = (name) => categories.find((c) => c.name === name)._id;

  // A few at a time: fast enough, and kind to the in-memory database
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows.slice(i, i + 10).map(async ({ category, ...rest }) => {
        const res = await page.request.post(`${API_URL}/transactions`, {
          headers,
          data: { categoryId: idOf(category), ...rest },
        });
        expect(res.status()).toBe(201);
      })
    );
  }
}

// Only the notes of the rows that are on screen (a table on desktop, a list on phones: one of them is hidden)
const visibleNotes = (page, pattern) => page.getByText(pattern).filter({ visible: true });

test('search, page through the results and keep the filters after F5', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'search');

  // 30 coffees (2 pages of 20) and 15 other rows
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => ({ category: 'Food', amount: 10000 + i, note: `Coffee ${i + 1}` })),
    ...Array.from({ length: 15 }, (_, i) => ({ category: 'Bills', amount: 50000 + i, note: `Rent ${i + 1}` })),
  ];
  await seed(page, rows);

  await page.goto('/transactions');
  await expect(page.getByText('45 transactions', { exact: true })).toBeVisible();
  await expect(page.getByText('Page 1 of 3')).toBeVisible();

  // Search (after the 300 ms pause the word is in the URL), the list shrinks to the coffees
  await page.getByLabel('Search notes').fill('COFFEE');
  await expect(page).toHaveURL(/q=COFFEE/);
  await expect(page.getByText('30 transactions', { exact: true })).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(visibleNotes(page, /^Rent \d+$/)).toHaveCount(0);

  // Page 2 has the last 10 coffees
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(visibleNotes(page, /^Coffee \d+$/)).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();

  // F5: the search word, the page and the list are all still there
  await page.reload();
  await expect(page).toHaveURL(/q=COFFEE/);
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByLabel('Search notes')).toHaveValue('COFFEE');
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(visibleNotes(page, /^Coffee \d+$/)).toHaveCount(10);

  // A new filter goes back to page 1; Clear filters empties the search box and the URL
  await chooseOption(page.getByLabel('Sort'), 'Lowest amount');
  await expect(page).toHaveURL(/sort=amount/);
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(visibleNotes(page, /^Coffee \d+$/).first()).toHaveText('Coffee 1'); // lowest amount first

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Search notes')).toHaveValue('');
  await expect(page).not.toHaveURL(/q=|sort=|page=/);
  await expect(page.getByText('45 transactions', { exact: true })).toBeVisible();
});

test('tag a transaction, then click its tag to filter the list', async ({ page }, testInfo) => {
  await register(page, testInfo, 'tags');
  await seed(page, [{ category: 'Food', amount: 20000, note: 'Plain coffee' }]);

  // 1. Add a transaction with two tags (typed in capitals: they are saved in lower case)
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await dialog.getByLabel('Amount').fill('85000');
  await dialog.getByRole('button', { name: 'Food' }).click();
  await dialog.getByLabel('Note').fill('Team lunch');
  await dialog.getByLabel('Tags').fill('#Work');
  await dialog.getByLabel('Tags').press('Enter');
  await dialog.getByLabel('Tags').fill('Team-Lunch');
  await dialog.getByLabel('Tags').press('Enter');
  await expect(dialog.getByRole('button', { name: 'Remove tag work' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Remove tag team-lunch' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save transaction' }).click();
  await expect(dialog).toBeHidden();
  await expect(visibleNotes(page, 'Team lunch')).toBeVisible();
  await expect(visibleNotes(page, 'Plain coffee')).toBeVisible();

  // 2. The next form offers the tags that were used before
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const second = page.getByRole('dialog', { name: 'Add transaction' });
  await expect(second.getByRole('button', { name: /^#work/ })).toBeVisible();
  await second.getByRole('button', { name: 'Cancel' }).click();
  await expect(second).toBeHidden();

  // 3. Click the tag chip: only the tagged transaction is left, and the tag is in the URL
  await page.getByRole('button', { name: 'Filter by tag work' }).click();
  await expect(page).toHaveURL(/tag=work/);
  await expect(page.getByText('Tag: #work')).toBeVisible();
  await expect(visibleNotes(page, 'Team lunch')).toBeVisible();
  await expect(visibleNotes(page, 'Plain coffee')).toHaveCount(0);

  // 4. F5 keeps the tag filter
  await page.reload();
  await expect(page.getByText('Tag: #work')).toBeVisible();
  await expect(visibleNotes(page, 'Plain coffee')).toHaveCount(0);

  // 5. Removing the filter brings the other transaction back
  await page.getByRole('button', { name: 'Remove tag filter work' }).click();
  await expect(page).not.toHaveURL(/tag=/);
  await expect(visibleNotes(page, 'Plain coffee')).toBeVisible();
  await expect(visibleNotes(page, 'Team lunch')).toBeVisible();
});

test('export the list as a CSV file, then import that same file', async ({ page }, testInfo) => {
  await register(page, testInfo, 'csv');
  await seed(page, [
    { category: 'Food', amount: 45000, note: 'Lunch, with team', tags: ['work', 'trip'] },
    { category: 'Food', amount: 30000, note: 'Cà phê sữa' },
    { category: 'Salary', amount: 9000000, note: '=SUM(A1)' },
  ]);

  await page.goto('/transactions');
  await expect(page.getByText('3 transactions', { exact: true })).toBeVisible();

  // 1. Export: a file is downloaded with the right name and content
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ledgerling-\d{4}-\d{2}\.csv$/);
  const file = testInfo.outputPath('export.csv');
  await download.saveAs(file);

  const content = fs.readFileSync(file, 'utf8');
  expect(content.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM, so Excel reads the accents
  expect(content).toContain('Date,Type,Category,Amount,Currency,Note,Tags');
  expect(content).toContain('"Lunch, with team"');
  expect(content).toContain('work;trip');
  expect(content).toContain('Cà phê sữa');
  expect(content).toContain("'=SUM(A1)"); // a formula is made harmless in the file

  // 2. Import the same file: the preview shows 3 good rows
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import CSV' });
  await dialog.getByLabel('CSV file').setInputFiles(file);
  await expect(dialog.getByText('3 rows found.')).toContainText('All rows look fine.');
  await expect(dialog.getByRole('region', { name: 'Preview of the file' }).getByText('Ready')).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Import 3 rows' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Imported 3 transactions.');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();

  // 3. Every transaction is there twice, and the formula note came back without the ' in front
  await expect(page.getByText('6 transactions', { exact: true })).toBeVisible();
  await expect(visibleNotes(page, '=SUM(A1)')).toHaveCount(2);
  await expect(visibleNotes(page, 'Cà phê sữa')).toHaveCount(2);

  // 4. The tags came back too: filtering by one finds the original and the copy
  await page.goto('/transactions?tag=trip');
  await expect(page.getByText('2 transactions', { exact: true })).toBeVisible();
});

test('importing a file with a bad row marks it and imports only the good rows', async ({ page }, testInfo) => {
  await register(page, testInfo, 'badrow');

  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import CSV' });

  // A file that is not an export is refused with a message
  await dialog.getByLabel('CSV file').setInputFiles({
    name: 'other.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Date,Note\n2026-10-01,Lunch\n'),
  });
  await expect(dialog.getByText(/has no Type, Category, Amount column/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Import 0 rows' })).toBeDisabled();

  // Row 2 uses a category that does not exist
  const csv = [
    'Date,Type,Category,Amount,Currency,Note,Tags',
    '2026-10-02 08:00,expense,Food,35000,VND,Good row,work',
    '2026-10-03 08:00,expense,Groceries,10000,VND,Bad row,',
  ].join('\r\n');
  await dialog.getByLabel('CSV file').setInputFiles({ name: 'mixed.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(dialog.getByText('2 rows found.')).toContainText('1 row with a problem will be skipped.');
  await expect(dialog.getByText('Category "Groceries" (expense) not found')).toBeVisible();

  await dialog.getByRole('button', { name: 'Import 1 row' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Imported 1 transaction. 1 row could not be imported.');
  await expect(dialog.getByRole('list', { name: 'Rows that were not imported' })).toContainText(
    'Row 2: Category "Groceries" (expense) not found'
  );
  await dialog.getByRole('button', { name: 'Done' }).click();

  // The good row is in October 2026, so look at that month
  await page.goto('/transactions?month=2026-10');
  await expect(page.getByText('1 transaction', { exact: true })).toBeVisible();
  await expect(visibleNotes(page, 'Good row')).toBeVisible();
});
