import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pictures of the README (npm run screenshots:docs), saved in docs/screenshots/. Every page of the app at 1440 px
// and 390 px wide in the light theme, from the demo account of the end-to-end API (in-memory database with the sample
// data `npm run seed` makes) and its admin account; then the Dashboard in the dark theme, in German and in Japanese.
// Reduced motion: the numbers and the charts are drawn in their final state, without waiting for animations.
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screenshots');
const API_URL = 'http://localhost:4100/api';
const ADMIN = { email: 'admin@e2e.test', password: 'secret123' };

const SIZES = [
  { name: '1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: '390', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

// A table on a wide screen has an "Open details" button per row; a phone shows cards that are buttons themselves
async function openFirstTransaction(page, size) {
  const row =
    size.name === '390'
      ? page.getByRole('listitem').getByRole('button').filter({ visible: true }).first()
      : page.getByRole('button', { name: /^Open details of/ }).first();
  await row.click();
  await expect(page.getByRole('dialog').filter({ hasText: 'Transaction details' })).toBeVisible();
}

async function openCommandPalette(page) {
  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('command-input')).toBeFocused();
}

const PAGES = [
  { file: 'dashboard', path: '/', heading: 'Dashboard' },
  { file: 'transactions', path: '/transactions', heading: 'Transactions' },
  { file: 'transaction-drawer', path: '/transactions', heading: 'Transactions', then: openFirstTransaction },
  { file: 'categories', path: '/categories', heading: 'Categories' },
  { file: 'budgets', path: '/budgets', heading: 'Budgets' },
  { file: 'recurring', path: '/recurring', heading: 'Recurring' },
  { file: 'goals', path: '/goals', heading: 'Goals' },
  { file: 'wallets', path: '/wallets', heading: 'Wallets' },
  { file: 'reports-monthly', path: '/reports?tab=monthly', heading: 'Reports' },
  { file: 'reports-yearly', path: '/reports?tab=yearly', heading: 'Reports' },
  { file: 'reports-calendar', path: '/reports?tab=calendar', heading: 'Reports' },
  { file: 'notifications', path: '/notifications', heading: 'Notifications' },
  { file: 'settings', path: '/settings', heading: 'Settings' },
  { file: 'command-palette', path: '/', heading: 'Dashboard', then: openCommandPalette },
];

// Signs in through the API (the demo, or an account with a password), saves the token like the app does and sets the
// preferences of the account, which the app applies when it opens
async function signIn(context, request, { account, preferences }) {
  const response = account
    ? await request.post(`${API_URL}/auth/login`, { data: account })
    : await request.post(`${API_URL}/auth/demo`);
  expect(response.status()).toBe(200);
  const { token } = (await response.json()).data;
  const saved = await request.patch(`${API_URL}/users/me/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
    data: preferences,
  });
  expect(saved.status()).toBe(200);
  await context.addInitScript((value) => localStorage.setItem('token', value), token);
}

async function shoot(page, file) {
  await page.waitForLoadState('networkidle');
  // The fonts and the last frame of the charts
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUTPUT, `${file}.jpg`), type: 'jpeg', quality: 80 });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await mkdir(OUTPUT, { recursive: true });
});

for (const size of SIZES) {
  test(`every page at ${size.name} px, light theme`, async ({ browser, request }) => {
    test.setTimeout(240000);
    const options = { ...size, reducedMotion: 'reduce', colorScheme: 'light' };

    // The landing page, signed out
    const visitor = await browser.newContext(options);
    await visitor.addInitScript(() => {
      localStorage.setItem('ledgerling.theme', 'light');
      localStorage.setItem('ledgerling.tourSeen', '1');
    });
    const landing = await visitor.newPage();
    await landing.goto('/welcome');
    await expect(landing.getByRole('heading', { name: 'Know where your money goes.', level: 1 })).toBeVisible();
    await shoot(landing, `welcome-${size.name}`);
    await visitor.close();

    // The pages of the demo account
    const demo = await browser.newContext(options);
    await demo.addInitScript(() => localStorage.setItem('ledgerling.tourSeen', '1'));
    await signIn(demo, request, { preferences: { theme: 'light', language: 'en' } });
    const page = await demo.newPage();
    for (const shot of PAGES) {
      await page.goto(shot.path);
      await expect(page.getByRole('heading', { name: shot.heading, level: 1 })).toBeVisible();
      if (shot.then) await shot.then(page, size);
      await shoot(page, `${shot.file}-${size.name}`);
    }
    await demo.close();

    // The Admin page, from the admin account
    const admin = await browser.newContext(options);
    await admin.addInitScript(() => localStorage.setItem('ledgerling.tourSeen', '1'));
    await signIn(admin, request, { account: ADMIN, preferences: { theme: 'light', language: 'en' } });
    const adminPage = await admin.newPage();
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible();
    await shoot(adminPage, `admin-${size.name}`);
    await admin.close();
  });
}

test('the Dashboard in the dark theme, in German and in Japanese', async ({ browser, request }) => {
  test.setTimeout(120000);
  const variants = [
    { file: 'dashboard-dark-1440', preferences: { theme: 'dark', language: 'en' }, lang: 'en' },
    { file: 'dashboard-de-1440', preferences: { theme: 'light', language: 'de' }, lang: 'de' },
    { file: 'dashboard-ja-1440', preferences: { theme: 'light', language: 'ja' }, lang: 'ja' },
  ];
  for (const variant of variants) {
    const context = await browser.newContext({ ...SIZES[0], reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('ledgerling.tourSeen', '1'));
    await signIn(context, request, { preferences: variant.preferences });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', variant.lang);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await shoot(page, variant.file);
    await context.close();
  }
});
