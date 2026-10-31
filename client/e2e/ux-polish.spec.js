import { expect, test } from '@playwright/test';

// The UX polish phase: Settings in sections, the way back, collapsing, the language picker, the user menu, the command
// palette, the tour, the Session expired dialog and the small helpers. Every test runs on a desktop and on a phone screen.
const API_URL = 'http://localhost:4100/api';
const PASSWORD = 'secret123';
const SECTIONS = ['Profile', 'Security', 'Appearance', 'Preferences', 'Notifications', 'App', 'Data', 'Danger zone'];

const isPhone = (testInfo) => testInfo.project.name === 'mobile';

async function register(page, testInfo, label) {
  const email = `ux-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Polish Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  return email;
}

async function tryTheDemo(page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

const settingsMenu = (page) => page.getByRole('navigation', { name: 'Settings sections' });
const sectionLink = (page, name) => settingsMenu(page).getByRole('link', { name: new RegExp(`^${name}\\b`) });
const bodyWidthFits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('Settings in sections', () => {
  test('wide screen: a column of sections, and only the chosen one is shown', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'the phone has its own test');
    await register(page, testInfo, 'wide');
    await page.goto('/settings');

    // /settings opens Profile
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await expect(page.getByRole('heading', { name: 'Your avatar' })).toBeVisible();
    await expect(page).toHaveTitle('Profile · Ledgerling');

    // The menu is on the left of the section, each row with an icon, a name and one line of text
    for (const name of SECTIONS) await expect(sectionLink(page, name)).toBeVisible();
    await expect(sectionLink(page, 'Security')).toContainText('Password and signed-in devices');
    await expect(sectionLink(page, 'Security').locator('svg').first()).toBeVisible();
    const menuBox = await settingsMenu(page).boundingBox();
    const backBox = await page.getByRole('link', { name: 'Back' }).boundingBox();
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(backBox.x);

    // Another section: its own address, and the one before is gone
    await sectionLink(page, 'Security').click();
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByRole('heading', { name: 'Password', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your avatar' })).toHaveCount(0);
    await expect(sectionLink(page, 'Security')).toHaveAttribute('aria-current', 'page');

    // F5 stays in the section
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Password', exact: true })).toBeVisible();

    // Back: first to the top of Settings, then out of it
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('phone: /settings is a list of cards, a section opens on its own with Back to the list', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'the wide screen has its own test');
    await register(page, testInfo, 'phone');
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/settings$/);
    for (const name of SECTIONS) await expect(sectionLink(page, name)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your avatar' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back' })).toHaveCount(0);

    await sectionLink(page, 'Appearance').click();
    await expect(page).toHaveURL(/\/settings\/appearance$/);
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible();
    await expect(settingsMenu(page)).toHaveCount(0);

    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(sectionLink(page, 'Appearance')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Dark' })).toHaveCount(0);
  });

  test('Danger zone only shows when it is chosen, with a red border', async ({ page }, testInfo) => {
    await register(page, testInfo, 'danger');
    await page.goto('/settings/profile');
    await expect(page.getByRole('heading', { name: 'Danger zone' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0);

    await page.goto('/settings/danger');
    const heading = page.getByRole('heading', { name: 'Danger zone' });
    await expect(heading).toBeVisible();
    const card = page.locator('form').locator('xpath=ancestor::div[.//h2][1]');
    const color = await card.evaluate((element) => getComputedStyle(element).borderTopColor);
    const expense = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'var(--color-expense)';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    expect(color).toBe(expense);
  });

  test('the Danger zone fields are never filled in by the browser', async ({ page }, testInfo) => {
    await register(page, testInfo, 'autofill');
    await page.goto('/settings/danger');

    const word = page.getByLabel('Type DELETE to confirm');
    const password = page.getByLabel('Your password');
    await expect(word).toHaveValue('');
    await expect(password).toHaveValue('');
    await expect(word).toHaveAttribute('autocomplete', 'off');
    await expect(word).toHaveAttribute('name', 'delete-confirmation');
    await expect(word).toHaveAttribute('type', 'text');
    await expect(password).toHaveAttribute('autocomplete', 'new-password');
    await expect(password).toHaveAttribute('name', 'delete-account-password');
    await expect(page.locator('form', { has: password })).toHaveAttribute('autocomplete', 'off');
    for (const attribute of ['data-1p-ignore', 'data-lpignore', 'data-bwignore']) {
      await expect(word).toHaveAttribute(attribute, 'true');
      await expect(password).toHaveAttribute(attribute, 'true');
    }
    // Nothing in the form looks like a login to a browser
    await expect(page.locator('form', { has: password }).locator('input[autocomplete="current-password"], input[autocomplete="username"], input[autocomplete="email"]')).toHaveCount(0);
  });

  test('leaving a form with unsaved changes asks first', async ({ page }, testInfo) => {
    await register(page, testInfo, 'unsaved');
    await page.goto('/settings/profile');
    const name = page.getByLabel('Name', { exact: true });
    await name.fill('A new name');

    await page.getByRole('link', { name: 'Back' }).click();
    const question = page.getByRole('dialog', { name: 'Leave without saving?' });
    await expect(question).toBeVisible();

    // Stay: the same page, with what was typed
    await question.getByRole('button', { name: 'Stay' }).click();
    await expect(question).toBeHidden();
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await expect(name).toHaveValue('A new name');

    // Saved: nothing to ask any more
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Name updated')).toBeVisible();
    await page.goto('/settings/security');

    // Leave: goes on, and what was typed is gone
    await page.getByLabel('Current password').fill('half typed');
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }).click();
    await expect(question).toBeVisible();
    await question.getByRole('button', { name: 'Leave' }).click();
    await expect(page).toHaveURL(/\/welcome$/);
  });
});

test.describe('the way back', () => {
  test('the logo goes to /welcome, which offers Open app', async ({ page }, testInfo) => {
    await register(page, testInfo, 'logo');
    await page.getByTestId('sidebar-logo').click();

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole('link', { name: 'Log in' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Get started' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open app' }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Open app' }).first().click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('Back closes the transaction drawer and keeps the list', async ({ page }, testInfo) => {
    await register(page, testInfo, 'drawer');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}` };
    const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
    await page.request.post(`${API_URL}/transactions`, { headers, data: { categoryId: categories[0]._id, amount: 45000, note: 'Pho' } });

    await page.goto('/transactions');
    await page.getByText('Pho').filter({ visible: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Transaction details' });
    await drawer.getByRole('button', { name: 'Back' }).click();

    await expect(drawer).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  });

  test('Back goes from Admin / Users to Admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@e2e.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin', level: 1 })).toBeVisible();
  });
});

test.describe('collapsing', () => {
  test('the sidebar folds to about 72px, shows tooltips, and F5 keeps it', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'a phone has a top bar instead of a sidebar');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await register(page, testInfo, 'sidebar');
    const sidebar = page.locator('aside');
    const widthOf = async () => (await sidebar.boundingBox()).width;

    expect(await widthOf()).toBeGreaterThan(200);
    await page.getByTestId('sidebar-toggle').click();
    await expect.poll(widthOf).toBeLessThanOrEqual(72);
    expect(await widthOf()).toBeGreaterThanOrEqual(60);

    // Links keep their names for a screen reader; the name shows next to the icon on hover
    const budgets = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Budgets' });
    await budgets.hover();
    expect(await budgets.evaluate((element) => getComputedStyle(element, '::after').content)).toBe('"Budgets"');

    // The language picker is only its short code here
    const language = page.getByTestId('language-select');
    await expect(language).toHaveText('EN');
    await expect(language.locator('svg')).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect.poll(widthOf).toBeLessThanOrEqual(72);
    expect(await page.evaluate(() => localStorage.getItem('ledgerling.sidebarCollapsed'))).toBe('1');

    // The [ key folds and opens it too
    await page.keyboard.press('[');
    await expect.poll(widthOf).toBeGreaterThan(200);
    await page.keyboard.press('[');
    await expect.poll(widthOf).toBeLessThanOrEqual(72);

    // Not while typing in a field
    await page.goto('/transactions');
    await page.locator('[data-hotkey-search]').filter({ visible: true }).first().focus();
    await page.keyboard.press('[');
    await expect.poll(widthOf).toBeLessThanOrEqual(72);
  });

  test('on a low laptop screen the account card stays on screen, open and folded, also with the Admin link', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'a phone has a top bar instead of a sidebar');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@e2e.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    const account = page.getByTestId('account');
    await expect(account).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('[');
    await expect(page.locator('[data-sidebar="collapsed"]')).toBeVisible();
    await page.waitForTimeout(400);
    await expect(account).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('sidebar-toggle')).toBeInViewport({ ratio: 1 });
  });

  test('the fold is smooth, and at once with prefers-reduced-motion', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'a phone has a top bar instead of a sidebar');
    await register(page, testInfo, 'motion');
    const duration = () => page.locator('[data-sidebar]').evaluate((element) => getComputedStyle(element).transitionDuration);

    expect(await duration()).not.toBe('0s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await duration()).toBe('0s');
  });

  test('a card on the Dashboard folds and keeps its state after F5, each card on its own', async ({ page }) => {
    await tryTheDemo(page);
    const card = page.locator('[data-card="dashboard.budgetAlerts"]');
    const other = page.locator('[data-card="dashboard.savingsGoals"]');
    await expect(card.getByText(/Over by/).first()).toBeVisible();

    await card.getByRole('button', { name: 'Collapse Budget alerts' }).click();
    await expect(card).toHaveAttribute('data-collapsed', 'true');
    await expect(card.getByText(/Over by/).first()).toBeHidden();
    await expect(card.getByRole('heading', { name: 'Budget alerts' })).toBeVisible();
    await expect(other).toHaveAttribute('data-collapsed', 'false');

    await page.reload();
    await expect(card).toHaveAttribute('data-collapsed', 'true');
    await expect(card.getByText(/Over by/).first()).toBeHidden();

    await card.getByRole('button', { name: 'Expand Budget alerts' }).click();
    await expect(card.getByText(/Over by/).first()).toBeVisible();
    await page.reload();
    await expect(card).toHaveAttribute('data-collapsed', 'false');
  });

  test('a chart inside a card is really drawn, also after folding and opening it', async ({ page }) => {
    await tryTheDemo(page);
    const card = page.locator('[data-card="dashboard.expenseByMonth"]');
    const chart = card.locator('svg.recharts-surface').first();
    const chartWidth = async () => (await chart.boundingBox())?.width ?? 0;
    await expect(chart).toBeVisible();
    await expect.poll(chartWidth).toBeGreaterThan(100);

    await card.getByRole('button', { name: 'Collapse Expense by month' }).click();
    await expect(chart).toBeHidden();
    await card.getByRole('button', { name: 'Expand Expense by month' }).click();
    await expect(chart).toBeVisible();
    await expect.poll(chartWidth).toBeGreaterThan(100);
  });

  test('a card on Reports folds and keeps its state, also on another tab and back', async ({ page }) => {
    await tryTheDemo(page);
    await page.goto('/reports');
    const card = page.locator('[data-card="reports.topCategories"]');
    await card.getByRole('button', { name: 'Collapse Top categories' }).click();
    await expect(card).toHaveAttribute('data-collapsed', 'true');

    await page.getByRole('tab', { name: 'Yearly' }).click();
    await expect(page.locator('[data-card="reports.monthByMonth"]')).toHaveAttribute('data-collapsed', 'false');
    await page.getByRole('tab', { name: 'Monthly' }).click();
    await expect(card).toHaveAttribute('data-collapsed', 'true');

    // The same insights card keeps its own state on each page
    await expect(page.locator('[data-card="reports.insights"]')).toHaveAttribute('data-collapsed', 'false');
  });
});

test.describe('the language picker', () => {
  test('shows a globe and a code, and opens the full list with a tick on the language in use', async ({ page }, testInfo) => {
    await register(page, testInfo, 'language');
    await openMenuIfNeeded(page);
    const picker = page.getByTestId('language-select');

    await expect(picker).toHaveText('EN');
    await expect(picker.locator('svg')).toHaveCount(1);
    await expect(page.getByRole('option')).toHaveCount(0);

    await picker.click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(8);
    const rows = [
      ['English', 'EN'],
      ['Tiếng Việt', 'VI'],
      ['Français', 'FR'],
      ['Deutsch', 'DE'],
      ['Español', 'ES'],
      ['中文（简体）', 'ZH'],
      ['日本語', 'JA'],
      ['한국어', 'KO'],
    ];
    for (let index = 0; index < rows.length; index += 1) {
      await expect(options.nth(index)).toContainText(rows[index][0]);
      await expect(options.nth(index)).toContainText(rows[index][1]);
    }
    await expect(page.getByRole('option', { name: 'English', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('option', { name: 'English', exact: true }).locator('svg')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Deutsch', exact: true }).locator('svg')).toHaveCount(0);

    await page.getByRole('option', { name: 'Tiếng Việt', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(picker).toHaveText('VI');
  });

  test('is small on the public pages too', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('language-select')).toHaveText('EN');
    await page.goto('/welcome');
    await expect(page.getByTestId('language-select')).toHaveText('EN');
    expect((await page.getByTestId('language-select').boundingBox()).width).toBeLessThan(90);
  });
});

test.describe('the user menu', () => {
  test('opens from the card, with all its items, and each one works', async ({ page }, testInfo) => {
    await register(page, testInfo, 'menu');
    const openUserMenu = async () => {
      await openMenuIfNeeded(page);
      await page.getByTestId('account').click();
    };

    await openUserMenu();
    for (const name of ['Profile', 'Settings', 'Keyboard shortcuts', 'Take the tour', 'Log out']) {
      await expect(page.getByRole('menuitem', { name })).toBeVisible();
    }

    // Theme: the page changes at once, and the menu stays open
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('menuitemradio', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
    const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(shortcuts).toBeVisible();
    await expect(shortcuts.getByText('Open the command palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(shortcuts).toBeHidden();

    // After the dialog the phone menu may still be open
    const closeButton = page.getByRole('button', { name: 'Close menu' });
    if (await closeButton.isVisible()) await closeButton.click();

    await openUserMenu();
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);

    await openUserMenu();
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
});

test.describe('the command palette', () => {
  const input = (page) => page.getByTestId('command-input');

  test('Ctrl+K, type, Enter jumps to the page; Escape and Ctrl+K close it', async ({ page }, testInfo) => {
    await register(page, testInfo, 'palette');

    await page.keyboard.press('Control+k');
    await expect(input(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(input(page)).toBeHidden();

    // The same keys while typing in a field
    await page.goto('/transactions');
    await page.locator('[data-hotkey-search]').filter({ visible: true }).first().focus();
    await page.keyboard.press('Control+k');
    await expect(input(page)).toBeFocused();
    await page.keyboard.press('Control+k');
    await expect(input(page)).toBeHidden();

    await page.keyboard.press('Meta+k');
    await input(page).fill('budg');
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/budgets$/);
    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible();

    // A section of Settings (the keys are ignored while a dialog is still closing)
    await expect(input(page)).toBeHidden();
    await page.keyboard.press('Control+k');
    await input(page).fill('security');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/settings\/security$/);
  });

  test('finds a transaction by its note and opens it in the list', async ({ page }, testInfo) => {
    await register(page, testInfo, 'find');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}` };
    const categories = (await (await page.request.get(`${API_URL}/categories`, { headers })).json()).data;
    const food = categories.find((c) => c.name === 'Food');
    await page.request.post(`${API_URL}/transactions`, { headers, data: { categoryId: food._id, amount: 12000, note: 'Zebra cake', date: '2025-03-14T05:00:00.000Z' } });

    await page.keyboard.press('Control+k');
    await input(page).fill('zebra');
    const row = page.getByRole('option', { name: /Zebra cake/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('2025');
    await row.click();

    await expect(page).toHaveURL(/\/transactions\?from=2025-03-14&to=2025-03-14&q=Zebra\+cake/);
    await expect(page.getByText('Zebra cake').filter({ visible: true })).toBeVisible();
  });

  test('runs Add transaction, Toggle theme and Change language', async ({ page }, testInfo) => {
    await register(page, testInfo, 'run');

    await page.keyboard.press('Control+k');
    await input(page).fill('add trans');
    await page.keyboard.press('Enter');
    const quickAdd = page.getByRole('dialog', { name: 'Quick add' });
    await expect(quickAdd).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(quickAdd).toBeHidden();

    const before = await page.locator('html').getAttribute('data-theme');
    await page.keyboard.press('Control+k');
    await input(page).fill('theme');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before);

    // The keys are ignored while a dialog is still closing
    await expect(input(page)).toBeHidden();
    await page.keyboard.press('Control+k');
    await input(page).fill('language');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('option')).toHaveCount(8);
    await input(page).fill('deut');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { name: 'Übersicht', level: 1 })).toBeVisible();
  });

  test('can be opened with the mouse or a finger, from the search button in the menu', async ({ page }, testInfo) => {
    await register(page, testInfo, 'button');
    await openMenuIfNeeded(page);
    await page.getByRole('button', { name: 'Search…' }).click();
    await expect(input(page)).toBeFocused();
  });
});

test.describe('the tour', () => {
  // This browser never saw the tour (the other tests start with the key from playwright.config.js)
  test.use({ storageState: { cookies: [], origins: [] } });
  const tour = (page) => page.getByTestId('tour');

  test('opens on the first sign-in, goes through its steps and does not come back after Done', async ({ page }, testInfo) => {
    await register(page, testInfo, 'tour');
    await expect(tour(page)).toBeVisible();

    const titles = ['Quick add', 'Dashboard', 'Budgets', 'Reports', 'Settings', 'Your account'];
    for (let index = 0; index < titles.length; index += 1) {
      await expect(tour(page).getByRole('heading', { name: titles[index] })).toBeVisible();
      await expect(tour(page)).toContainText(`Step ${index + 1} of 6`);
      // The hole in the dark sits right on the element, also inside the phone menu
      await expect(tour(page).locator('span[aria-hidden="true"]').first()).toHaveCSS('box-shadow', /200|px/);
      await tour(page).getByRole('button', { name: index === titles.length - 1 ? 'Done' : 'Next' }).click();
    }

    await expect(tour(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ledgerling.tourSeen'))).toBe('1');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);
  });

  test('Skip closes it for good, and the user menu opens it again', async ({ page }, testInfo) => {
    await register(page, testInfo, 'skip');
    await tour(page).getByRole('button', { name: 'Skip' }).click();
    await expect(tour(page)).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(tour(page)).toHaveCount(0);

    await openMenuIfNeeded(page);
    await page.getByTestId('account').click();
    await page.getByRole('menuitem', { name: 'Take the tour' }).click();
    await expect(tour(page).getByRole('heading', { name: 'Quick add' })).toBeVisible();

    // Escape skips too; Back goes one step back
    await tour(page).getByRole('button', { name: 'Next' }).click();
    await expect(tour(page).getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await tour(page).getByRole('button', { name: 'Back' }).click();
    await expect(tour(page).getByRole('heading', { name: 'Quick add' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
  });

  test('stays inside the window on every step', async ({ page }, testInfo) => {
    await register(page, testInfo, 'fit');
    const size = page.viewportSize();
    for (let index = 0; index < 6; index += 1) {
      const card = tour(page).locator('h2').locator('..');
      await expect(card).toBeVisible();
      // The card moves for a moment: read it once it stopped
      await page.waitForTimeout(450);
      const box = await card.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      await tour(page).getByRole('button', { name: index === 5 ? 'Done' : 'Next' }).click();
    }
  });
});

test.describe('the Session expired dialog', () => {
  test('a 401 shows the dialog over the page, and the login comes back to the same page', async ({ page }, testInfo) => {
    const email = await register(page, testInfo, 'expired');
    await page.goto('/reports?tab=yearly');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // The token stops working, and the next request of this page is answered with 401
    await page.evaluate(() => localStorage.setItem('token', 'expired-token'));
    await page.getByRole('tab', { name: 'Calendar' }).click();

    const dialog = page.getByRole('dialog', { name: 'Session expired' });
    await expect(dialog).toBeVisible();
    // The visitor is not thrown out: the page is still there behind the dialog
    await expect(page).toHaveURL(/\/reports\?tab=calendar/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

    await dialog.getByRole('button', { name: 'Log in again' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/reports\?tab=calendar/);
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });

  test('also from the Dashboard: the way leads to the login and back, not to the landing page', async ({ page }, testInfo) => {
    const email = await register(page, testInfo, 'expired-home');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.setItem('token', 'expired-token'));

    await page.getByRole('button', { name: /next month|previous month/i }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Session expired' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('a wrong password on the login page is not a session that expired', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Session expired' })).toHaveCount(0);
  });
});

test.describe('the small helpers', () => {
  test('a thin bar shows along the top while data is on its way', async ({ page }, testInfo) => {
    await register(page, testInfo, 'bar');
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let reached;
    const requestStarted = new Promise((resolve) => {
      reached = resolve;
    });
    await page.route('**/api/goals*', async (route) => {
      reached();
      await gate;
      await route.continue();
    });

    await page.goto('/budgets');
    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible();
    await openMenuIfNeeded(page);
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Goals' }).click();

    // The request is on its way and held back: the bar stays until it is let through
    await requestStarted;
    const bar = page.getByTestId('top-progress');
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box.y).toBe(0);
    expect(box.height).toBeLessThanOrEqual(4);

    release();
    await expect(bar).toBeHidden();
  });

  test('Skip to content is the first stop of the Tab key, and moves the focus to the page', async ({ page }, testInfo) => {
    await register(page, testInfo, 'skiplink');
    await page.goto('/budgets');
    await expect(page.getByRole('heading', { name: 'Budgets', level: 1 })).toBeVisible();

    const link = page.getByRole('link', { name: 'Skip to content' });
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await expect(page).toHaveURL(/\/budgets$/);
    await expect(link).not.toBeInViewport();
  });

  test('About, Privacy and Terms open from the footer of /welcome, follow the language and have a way back', async ({ page }) => {
    await page.goto('/welcome');
    const footer = page.getByRole('contentinfo');

    for (const [name, path] of [['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms']]) {
      await footer.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(`${name} · Ledgerling`);
      await page.getByRole('link', { name: 'Back' }).click();
      await expect(page).toHaveURL(/\/welcome$/);
    }

    await page.goto('/privacy');
    await page.getByTestId('language-select').click();
    await page.getByRole('option', { name: 'Tiếng Việt', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quyền riêng tư', level: 1 })).toBeVisible();
  });
});

test.describe('the screen sizes of the phase', () => {
  for (const { label, width, height } of [
    { label: '1440px', width: 1440, height: 900 },
    { label: '390px', width: 390, height: 844 },
  ]) {
    test(`nothing scrolls sideways at ${label}, with the sidebar open and folded`, async ({ page }, testInfo) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height });
      await register(page, testInfo, `size${width}`);

      const pages = ['/', '/settings', '/settings/security', '/settings/danger', '/reports', '/welcome', '/about', '/privacy', '/terms'];
      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        expect(await bodyWidthFits(page), `${path} at ${label}`).toBe(true);
      }

      if (width > 767) {
        await page.goto('/settings/profile');
        await page.keyboard.press('[');
        expect(await bodyWidthFits(page), `folded at ${label}`).toBe(true);
      }
    });
  }
});
