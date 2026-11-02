import { expect, test } from '@playwright/test';
import { isPhone } from './helpers/device.js';

// The whole app can be used with the keyboard: a dialog, the drawer and the command palette keep the focus inside
// while they are open, Escape closes them, and the focus goes back to what opened them (not to the top of the page).

async function signInAsDemo(page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Presses Tab many times and says whether the focus ever reached something of the page behind the open dialog.
// (After the last button of a native modal dialog the browser may move the focus to its own toolbar, where
// document.activeElement is <body>: that is not the page behind, which stays out of reach.)
async function focusStaysIn(page, dialog) {
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    const escaped = await dialog.evaluate((element) => {
      const active = document.activeElement;
      return Boolean(active) && active !== document.body && !element.contains(active);
    });
    if (escaped) return false;
  }
  return true;
}

test('a dialog keeps the focus, Escape closes it, and the focus goes back to its button', async ({ page }) => {
  await signInAsDemo(page);
  await page.goto('/transactions');
  const add = page.getByRole('button', { name: 'Add transaction' }).first();
  // The button waits for the list to load (a disabled button cannot take the focus)
  await expect(add).toBeEnabled();
  await add.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Add transaction' });
  await expect(dialog).toBeVisible();
  expect(await focusStaysIn(page, dialog)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
});

test('the drawer of a transaction keeps the focus, and Escape gives it back to the row', async ({ page }, testInfo) => {
  await signInAsDemo(page);
  await page.goto('/transactions');
  // A wide screen shows a table with an "Open details" button per row; a phone shows cards that are buttons themselves
  const open =
    isPhone(testInfo)
      ? page.getByRole('listitem').getByRole('button').filter({ visible: true }).first()
      : page.getByRole('button', { name: /^Open details of/ }).first();
  await open.focus();
  await page.keyboard.press('Enter');

  const drawer = page.getByRole('dialog').filter({ hasText: 'Transaction details' });
  await expect(drawer).toBeVisible();
  expect(await focusStaysIn(page, drawer)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(open).toBeFocused();
});

test('the command palette keeps the focus in its search box, and Escape gives it back', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'the search button is inside the menu on a phone');
  await signInAsDemo(page);
  const search = page.getByRole('button', { name: /Search/ }).first();
  await search.focus();
  await page.keyboard.press('Enter');

  const palette = page.locator('dialog:has([data-testid="command-input"])');
  await expect(page.getByTestId('command-input')).toBeFocused();
  expect(await focusStaysIn(page, palette)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('command-input')).toBeHidden();
  await expect(search).toBeFocused();
});
