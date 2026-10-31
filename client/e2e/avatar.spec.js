import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Avatars: a ready-made one or an uploaded photo, shown in the menu at once and kept after a reload.
// The API (playwright.config.js, in-memory database) seeds the demo account and one admin when it starts.
const API_URL = 'http://localhost:4100/api';
const PASSWORD = 'secret123';

// On a phone the menu is hidden behind a button; on a desktop the sidebar is always visible.
async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if ((await menuButton.isVisible()) && (await menuButton.getAttribute('aria-expanded')) === 'false') await menuButton.click();
}

async function register(page, testInfo, label, name = 'Avatar Tester') {
  const email = `e2e-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  return email;
}

async function openProfile(page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Your avatar' })).toBeVisible();
}

// The avatar in the account block of the sidebar (on a phone: inside the menu panel)
async function menuAvatar(page) {
  await openMenuIfNeeded(page);
  return page.getByTestId('account').locator('[data-avatar]');
}

// The grid of the avatars of one group (the page has other radio buttons: theme, week start)
const grid = (page, group) => page.getByRole('radiogroup', { name: group, exact: true });

const meAvatar = async (page) => {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return (await response.json()).data.avatar;
};

test('a new account gets one of the ready-made avatars', async ({ page }, testInfo) => {
  await register(page, testInfo, 'random');

  const avatar = await menuAvatar(page);
  await expect(avatar).toHaveAttribute('data-avatar', 'preset');
  await expect(avatar.locator('img')).toBeVisible();
  expect((await meAvatar(page)).type).toBe('preset');
});

test('picking a ready-made avatar shows it in the menu at once and keeps it after a reload', async ({ page }, testInfo) => {
  await register(page, testInfo, 'preset');
  await openProfile(page);

  // Four tabs of eight avatars
  for (const group of ['Animals', 'Food', 'Nature', 'Fun']) {
    await page.getByRole('button', { name: group, exact: true }).click();
    await expect(grid(page, group).getByRole('radio')).toHaveCount(8);
  }

  await page.getByRole('button', { name: 'Animals', exact: true }).click();
  const fox = grid(page, 'Animals').getByRole('radio', { name: 'Fox' });
  await fox.click();
  await expect(fox).toBeChecked();
  await expect(page.getByText('Avatar updated')).toBeVisible();

  const chosen = await fox.locator('img').getAttribute('src');
  const inMenu = await menuAvatar(page);
  await expect(inMenu).toHaveAttribute('data-avatar', 'preset');
  await expect(inMenu.locator('img')).toHaveAttribute('src', chosen);
  expect(await meAvatar(page)).toEqual({ type: 'preset', value: 'fox' });

  // F5: the choice is kept (it comes from the API, not from the page)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your avatar' })).toBeVisible();
  await expect(grid(page, 'Animals').getByRole('radio', { name: 'Fox' })).toBeChecked();
  await expect((await menuAvatar(page)).locator('img')).toHaveAttribute('src', chosen);
});

test('an uploaded photo is cropped, shown in the menu at once and kept after a reload', async ({ page }, testInfo) => {
  await register(page, testInfo, 'upload');
  await openProfile(page);

  const photo = await readFile('public/pwa-512x512.png');
  await page.getByTestId('avatar-file').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: photo });

  // Step 2: the square box with the photo in it, a zoom slider, and nothing is saved yet
  const dialog = page.getByRole('dialog', { name: 'Adjust your photo' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toBeVisible();
  expect((await meAvatar(page)).type).toBe('preset');

  // Zoom in, then move the photo with the arrow keys
  await dialog.getByLabel('Zoom').fill('2');
  const area = dialog.getByTestId('avatar-crop-area');
  await area.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');

  await dialog.getByRole('button', { name: 'Use this photo' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Avatar updated')).toBeVisible();

  const inMenu = await menuAvatar(page);
  await expect(inMenu).toHaveAttribute('data-avatar', 'upload');
  const saved = await meAvatar(page);
  expect(saved.type).toBe('upload');
  // A small WebP: 256 x 256, about 100 kB at most
  expect(saved.value).toMatch(/^data:image\/webp;base64,/);
  expect(Buffer.from(saved.value.split(',')[1], 'base64').length).toBeLessThanOrEqual(100 * 1024);
  const size = await page.evaluate(
    (src) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
        image.src = src;
      }),
    saved.value
  );
  expect(size).toEqual([256, 256]);

  await page.reload();
  await expect((await menuAvatar(page)).locator('img')).toHaveAttribute('src', saved.value);
});

test('Cancel in the crop step saves nothing, and a file that is not an image is refused', async ({ page }, testInfo) => {
  await register(page, testInfo, 'cancel');
  await openProfile(page);
  const before = await meAvatar(page);

  const photo = await readFile('public/pwa-192x192.png');
  await page.getByTestId('avatar-file').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: photo });
  const dialog = page.getByRole('dialog', { name: 'Adjust your photo' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await meAvatar(page)).toEqual(before);

  await page.getByTestId('avatar-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByRole('alert')).toContainText('Choose a JPG, PNG or WebP image.');
  expect(await meAvatar(page)).toEqual(before);
});

test('Remove goes back to the first letter of the name', async ({ page }, testInfo) => {
  await register(page, testInfo, 'remove', 'Zed Remover');
  await openProfile(page);

  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('Avatar removed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();

  const inMenu = await menuAvatar(page);
  await expect(inMenu).toHaveAttribute('data-avatar', 'initial');
  await expect(inMenu).toHaveText('Z');
  expect(await meAvatar(page)).toBeUndefined();

  await page.reload();
  await expect((await menuAvatar(page))).toHaveText('Z');
});

test('the top bar of a phone shows the avatar and opens the profile; a wide screen has it in the sidebar only', async ({ page }, testInfo) => {
  await register(page, testInfo, 'bar');

  const barAvatar = page.getByTestId('bar-avatar');
  if (testInfo.project.name === 'mobile') {
    await expect(barAvatar).toBeVisible();
    await expect(barAvatar.locator('[data-avatar]')).toHaveAttribute('data-avatar', 'preset');
    await barAvatar.click();
    await expect(page).toHaveURL(/\/settings$/);
  } else {
    await expect(barAvatar).toBeHidden();
    await expect(page.getByTestId('account').locator('[data-avatar]')).toBeVisible();
  }
});

test('the avatar keeps a visible ring on the dark theme', async ({ page }, testInfo) => {
  await register(page, testInfo, 'dark');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

  const avatar = await menuAvatar(page);
  await expect(avatar).toBeVisible();
  const ring = await avatar.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(ring).not.toBe('none');
});

test('the demo account has its fixed avatar and cannot change it', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  const avatar = await menuAvatar(page);
  await expect(avatar).toHaveAttribute('data-avatar', 'preset');
  expect(await meAvatar(page)).toEqual({ type: 'preset', value: 'panda' });

  await openProfile(page);
  await expect(page.getByText('The demo account keeps one fixed avatar.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload photo' })).toHaveCount(0);
  // No grid of avatars (the Appearance card has radio buttons of its own, so only the avatar groups are looked at)
  await expect(page.getByRole('radiogroup', { name: 'Animals' })).toHaveCount(0);

  // The API refuses too
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.patch(`${API_URL}/users/me/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { type: 'preset', value: 'tiger' },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe('DEMO_READ_ONLY');
});

test('the Admin list shows the avatar of every user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@e2e.test');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    await expect(rows.nth(i).locator('[data-avatar]')).toBeVisible();
  }
  // The demo account has the avatar the seed gave it
  await page.getByLabel('Search by name or email').fill('demo@example.com');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('[data-avatar="preset"]')).toBeVisible();
});
