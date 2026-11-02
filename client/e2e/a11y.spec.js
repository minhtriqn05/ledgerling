import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isPhone } from './helpers/device.js';

// Phase 21: accessibility check with axe-core. Every page below must have no violation of impact "serious" or "critical"
// (labels, color contrast, alt text, button names, heading order, ...). The signed-in pages use the demo account, which has data.

const LEVELS = ['serious', 'critical'];

// A readable list of what axe found, so a failure says which element to fix
function describeViolations(violations) {
  return violations
    .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(' ')}\n    ${n.failureSummary?.split('\n').slice(0, 3).join(' | ')}`).join('\n')}`)
    .join('\n');
}

async function expectNoSeriousViolations(page) {
  // Animations (count-up, reveal) change colors and opacity while they run, which would give false contrast results
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = violations.filter((v) => LEVELS.includes(v.impact));
  expect(serious, describeViolations(serious)).toEqual([]);
}

async function signInAsDemo(page) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

test.describe('public pages', () => {
  test('Welcome', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('Welcome in dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/welcome');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('Login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  for (const [name, path, heading = name] of [
    ['About', '/about'],
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
    ['Register', '/register', 'Create your account'],
    ['Page not found', '/this-page-does-not-exist'],
  ]) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }
});

test.describe('signed-in pages (demo account)', () => {
  const pages = [
    { name: 'Dashboard', path: '/', heading: 'Dashboard' },
    { name: 'Transactions', path: '/transactions', heading: 'Transactions' },
    { name: 'Budgets', path: '/budgets', heading: 'Budgets' },
    { name: 'Wallets', path: '/wallets', heading: 'Wallets' },
    { name: 'Goals', path: '/goals', heading: 'Goals' },
    { name: 'Reports', path: '/reports', heading: 'Reports' },
    { name: 'Reports > Yearly', path: '/reports?tab=yearly', heading: 'Reports' },
    { name: 'Reports > Calendar', path: '/reports?tab=calendar', heading: 'Reports' },
    { name: 'Categories', path: '/categories', heading: 'Categories' },
    { name: 'Recurring', path: '/recurring', heading: 'Recurring' },
    { name: 'Notifications', path: '/notifications', heading: 'Notifications' },
    { name: 'Settings', path: '/settings', heading: 'Settings' },
    ...['profile', 'appearance', 'preferences', 'notifications', 'app', 'data'].map((section) => ({
      name: `Settings > ${section}`,
      path: `/settings/${section}`,
      heading: 'Settings',
    })),
  ];

  for (const { name, path, heading } of pages) {
    test(name, async ({ page }) => {
      await signInAsDemo(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expectNoSeriousViolations(page);

      // The same page in Porcelain. Only this browser tab changes: the demo account is shared.
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await expectNoSeriousViolations(page);
    });
  }
});

// The pages the demo account cannot open: the Admin pages and the two Settings sections hidden from the demo
test.describe('signed-in pages (admin account)', () => {
  for (const { name, path, heading } of [
    { name: 'Admin', path: '/admin', heading: 'Admin' },
    { name: 'Admin > Users', path: '/admin/users', heading: 'Users' },
    { name: 'Settings > security', path: '/settings/security', heading: 'Settings' },
    { name: 'Settings > danger', path: '/settings/danger', heading: 'Settings' },
  ]) {
    test(name, async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill('admin@e2e.test');
      await page.getByLabel('Password', { exact: true }).fill('secret123');
      await page.getByRole('button', { name: 'Log in' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expectNoSeriousViolations(page);

      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await expectNoSeriousViolations(page);
    });
  }
});

test.describe('what opens over a page', () => {
  test('the sidebar folded, the user menu and the command palette', async ({ page }, testInfo) => {
    await signInAsDemo(page);
    if (!isPhone(testInfo)) {
      await page.getByTestId('sidebar-toggle').click();
      await expectNoSeriousViolations(page);
    }

    const menuButton = page.getByRole('button', { name: 'Open menu' });
    if (await menuButton.isVisible()) await menuButton.click();
    await page.getByTestId('account').click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-input')).toBeFocused();
    await expectNoSeriousViolations(page);
  });

  test('a dialog and the drawer of a transaction, dark and light', async ({ page }, testInfo) => {
    await signInAsDemo(page);
    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add transaction' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible();
    await expectNoSeriousViolations(page);
    await page.keyboard.press('Escape');

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    // A wide screen opens a row with its "Open details" button, a phone with the card itself
    const row =
      isPhone(testInfo)
        ? page.getByRole('listitem').getByRole('button').filter({ visible: true }).first()
        : page.getByRole('button', { name: /^Open details of/ }).first();
    await row.click();
    await expect(page.getByRole('dialog').filter({ hasText: 'Transaction details' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test.describe('for somebody who has not seen the tour', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('the tour', async ({ page }) => {
      await signInAsDemo(page);
      await expect(page.getByTestId('tour')).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  });
});

test('the landing page has a visible focus ring on its actions, and a sensible heading order', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Heading order: one h1, then h2 sections, h3 inside them, never a skipped level
  const levels = await page.locator('h1, h2, h3, h4').evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])));
  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  levels.forEach((level, i) => {
    if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
  });

  // Tab to the first button/link of the hero: it must show an outline or a ring (focus-visible)
  const demo = page.getByRole('button', { name: 'Try the demo' });
  await demo.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(demo).toBeFocused();
  const ring = await demo.evaluate((el) => {
    const style = getComputedStyle(el);
    return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), shadow: style.boxShadow };
  });
  expect(ring.outlineStyle !== 'none' && ring.outlineWidth > 0 ? true : ring.shadow !== 'none').toBe(true);
});
