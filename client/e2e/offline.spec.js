import { expect, test } from '@playwright/test';

// Phase 22: offline use. The service worker only exists in the build, so these tests open `vite preview` on port 5175.

test.use({ baseURL: 'http://localhost:5175' });

// Signs in to the demo account, then loads the page once more through the service worker, which saves the answers
async function loadThroughServiceWorker(page, path = '/') {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20000 });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

const apiCacheEntries = (page) =>
  page.evaluate(async () => {
    const cache = await caches.open('ledgerling-api');
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });

test('offline, the dashboard that was loaded is still there, with the banner and locked buttons', async ({ page, context }) => {
  // No count-up animation, so the number can be read right away
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadThroughServiceWorker(page);
  const income = await page.locator('article', { hasText: 'Income' }).first().textContent();
  expect(income).toMatch(/[1-9]/);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(page.getByText("You're offline – showing saved data")).toBeVisible();
  await expect(page.locator('article', { hasText: 'Income' }).first()).toHaveText(income);
  await expect(page.getByTestId('live-status')).toHaveAttribute('data-status', 'reconnecting');

  // The round "+" is locked and says why
  const quickAdd = page.getByRole('button', { name: 'Quick add', exact: true });
  await expect(quickAdd).toBeDisabled();
  await expect(quickAdd).toHaveAttribute('title', "Not available while you're offline");

  // Back online: the banner goes and the button works again
  await context.setOffline(false);
  await expect(page.getByText("You're offline – showing saved data")).toBeHidden();
  await expect(quickAdd).toBeEnabled();
  await expect(page.getByTestId('live-status')).toHaveAttribute('data-status', 'live', { timeout: 15000 });
});

test('the banner comes up on an open page, and add, edit and delete are locked on the Transactions page', async ({ page, context }) => {
  await loadThroughServiceWorker(page, '/transactions');
  await expect(page.getByText("You're offline – showing saved data")).toBeHidden();

  await context.setOffline(true);
  await expect(page.getByText("You're offline – showing saved data")).toBeVisible();
  await expect(page.getByTestId('live-status')).toHaveAttribute('data-status', 'reconnecting');
  await expect(page.getByRole('button', { name: 'Add transaction' }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();

  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Add transaction' }).first()).toBeEnabled();
});

test('logging out deletes the saved API answers', async ({ page }) => {
  await loadThroughServiceWorker(page);
  expect((await apiCacheEntries(page)).length).toBeGreaterThan(0);
  expect(await apiCacheEntries(page)).toContain('/api/auth/me');
  expect(await apiCacheEntries(page)).not.toContain('/api/health');

  const menu = page.getByRole('button', { name: 'Open menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/(login|welcome)$/);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => caches.has('ledgerling-api'))).toBe(false);
});

test('the manifest has a maskable icon and the "Add transaction" shortcut, which opens Quick add', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  expect(manifest.shortcuts).toEqual([expect.objectContaining({ name: 'Add transaction', url: '/?quickAdd=1' })]);

  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  await page.goto(manifest.shortcuts[0].url);
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('Settings offers the install: the button with the browser event, the instructions without it', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  // Chrome decides by itself when to send the event, so the test sends one
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => {
      window.installPromptShown = true;
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Install app' }).click();
  await expect.poll(() => page.evaluate(() => window.installPromptShown)).toBe(true);

  // The offer works once; then come the instructions
  await expect(page.getByText('Add to Home Screen', { exact: false }).first()).toBeVisible();
});
