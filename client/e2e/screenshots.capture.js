import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Takes the pictures shown on the landing page, from the demo account (npm run screenshots).
// The API (npm run start:e2e) seeds the same sample data that `npm run seed` makes on Atlas, so the pictures
// show a believable month: balance, a budget over its limit, savings goals.
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'screenshots');

const PAGES = [
  { file: 'dashboard', path: '/', heading: 'Dashboard' },
  { file: 'transactions', path: '/transactions', heading: 'Transactions' },
  { file: 'budgets', path: '/budgets', heading: 'Budgets' },
  { file: 'goals', path: '/goals', heading: 'Goals' },
];

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'light' });

test('take the landing page pictures from the demo account', async ({ page }) => {
  test.setTimeout(120000);
  await mkdir(OUTPUT, { recursive: true });

  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  for (const shot of PAGES) {
    await page.goto(shot.path);
    await expect(page.getByRole('heading', { name: shot.heading, level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Let the count-up numbers, the reveal and the chart animations finish
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUTPUT, `${shot.file}.jpg`), type: 'jpeg', quality: 86 });
  }
});
