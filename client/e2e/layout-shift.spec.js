import { expect, test } from '@playwright/test';

// Nothing on the screen may jump while a page loads (Cumulative Layout Shift, the number Lighthouse reports).
// The answers of the API are held back for a moment, so the page shows its loading state first, like on a slow phone.

const SLOW_API_MS = 1500;
// Under 0.1 is what Lighthouse calls "good"
const GOOD_CLS = 0.1;

test.beforeEach(async ({ page }) => {
  // Adds up every layout shift that was not caused by the person (typing, clicking)
  await page.addInitScript(() => {
    window.__layoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__layoutShift += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
});

async function signInAsDemo(page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

for (const { name, path, heading } of [
  { name: 'Dashboard', path: '/', heading: 'Dashboard' },
  { name: 'Transactions', path: '/transactions', heading: 'Transactions' },
]) {
  test(`${name}: the page does not jump while its data arrives`, async ({ page }) => {
    await signInAsDemo(page);
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_API_MS));
      await route.continue();
    });

    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Let the last pieces (counters, charts) settle
    await page.waitForTimeout(800);

    const shift = await page.evaluate(() => window.__layoutShift);
    expect(shift).toBeLessThan(GOOD_CLS);
  });
}
