import { expect, test } from '@playwright/test';
import { isPhone } from './helpers/device.js';

// The bugs found by the full audit before the presentation (docs/review/ui-audit.md), one test each, so they cannot
// come back: things drawn over each other, cut words, a page that scrolls sideways, chart tooltips, hover bounce,
// the + button over the end of a page, the server waking up, a page that cannot be downloaded offline.

async function signInAsDemo(page) {
  await page.goto('/welcome');
  // A finger on a phone: a mouse click would leave Playwright's mouse over the page, and Chrome then ignores the
  // hover of later taps (a tap on the donut showed no tooltip)
  const button = page.getByRole('button', { name: 'Try the demo' });
  if (isPhone(test.info())) await button.tap();
  else await button.click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Another language for the demo account, set on this device only (the shared demo account keeps none)
async function useLanguage(page, code) {
  await page.evaluate((language) => localStorage.setItem('ledgerling.language', language), code);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

// The box of an element, or null when it is not on screen
const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return r.width && r.height ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null;
});
const overlap = (a, b) => Boolean(a && b) && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

test.describe('phone top bar', () => {
  test('the connection status, the bell, the face and the menu never overlap, in Vietnamese and German at 360 px', { tag: '@smoke' }, async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'The phone top bar only');
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsDemo(page);
    for (const language of ['vi', 'de', 'en']) {
      await useLanguage(page, language);
      const status = page.getByTestId('live-status');
      await expect(status).toBeVisible();
      const statusBox = await box(status);
      const bar = page.locator('aside').first();
      const barBox = await box(bar);
      expect(statusBox.left).toBeGreaterThanOrEqual(barBox.left);
      expect(statusBox.bottom).toBeLessThanOrEqual(barBox.bottom);
      for (const control of await bar.locator('button, a[data-testid="bar-avatar"]').filter({ visible: true }).all()) {
        expect(overlap(statusBox, await box(control)), `${language}: the status runs under a button`).toBe(false);
      }
      // the words are not cut by their box
      expect(await status.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
  });

  test('while the page scrolls, the top bar stays against the top edge (nothing shows above it)', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'The phone top bar only');
    await signInAsDemo(page);
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(async () => (await box(page.locator('aside').first())).top).toBeLessThan(1);
  });
});

test('Recurring: the Active switch never covers the date of the next run, at 360 px in Vietnamese and German', { tag: '@smoke' }, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await signInAsDemo(page);
  await page.goto('/recurring');
  for (const language of ['vi', 'de']) {
    await useLanguage(page, language);
    const rows = page.locator('main li').filter({ has: page.getByRole('switch') });
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) {
      const sw = await box(row.getByRole('switch'));
      for (const part of await row.locator('span, button').filter({ visible: true }).all()) {
        if (await part.evaluate((el) => el.getAttribute('role') === 'switch' || el.closest('[role="switch"]'))) continue;
        const text = await part.evaluate((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()));
        if (text || (await part.evaluate((el) => el.tagName === 'BUTTON'))) {
          expect(overlap(sw, await box(part)), `${language}: "${await part.innerText()}" is under the switch`).toBe(false);
        }
      }
    }
  }
});

test.describe('chart tooltips', () => {
  // Hover with a mouse, tap with a finger
  async function point(page, testInfo, locator, fx, fy) {
    const b = await box(locator);
    const x = b.left + b.width * fx;
    const y = b.top + b.height * fy;
    if (isPhone(testInfo)) await page.touchscreen.tap(x, y);
    else await page.mouse.move(x, y, { steps: 4 });
  }

  test('the tooltip of the monthly bars stands over its bar, inside the card, never on a bar, and a tap elsewhere hides it', { tag: '@smoke' }, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInAsDemo(page);
    const card = page.locator('[data-card="dashboard.expenseByMonth"]');
    const chart = card.locator('.recharts-wrapper');
    await chart.scrollIntoViewIfNeeded();
    // the chart 260 px below the top of the window: room above it for the tooltip, under the top bar
    await page.evaluate((top) => window.scrollBy(0, top - 260), (await box(chart)).top);
    const bars = chart.locator('.recharts-bar-background-rectangle');
    await expect(bars).toHaveCount(6);
    // The month names under the bars (SVG text: textContent, not innerText)
    const months = await chart.locator('.recharts-cartesian-axis-tick-value').allTextContents();

    for (const index of [0, 3, 5]) {
      const bar = await box(bars.nth(index));
      const b = await box(chart);
      await point(page, testInfo, chart, (bar.left + bar.width / 2 - b.left) / b.width, 0.6);
      const tip = chart.locator('.recharts-tooltip-wrapper > div');
      // The card of this bar: the card of the bar before is still on screen until the tap is handled, and a busy
      // machine measured that one (1 to 3 runs in 100)
      await expect(tip).toContainText(months[index]);
      const t = await box(tip);
      const c = await box(card);
      // inside the card
      expect(t.left).toBeGreaterThanOrEqual(c.left - 1);
      expect(t.right).toBeLessThanOrEqual(c.right + 1);
      expect(t.top).toBeGreaterThanOrEqual(c.top - 1);
      // centred over the bar, unless the edge of the chart holds it back
      const centred = Math.abs((t.left + t.right) / 2 - (bar.left + bar.right) / 2) < 2;
      const atEdge = Math.abs(t.left - b.left) < 2 || Math.abs(t.right - b.right) < 2;
      expect(centred || atEdge).toBe(true);
      // on no bar
      for (const other of await bars.all()) expect(overlap(t, await box(other))).toBe(false);
      // it does not glide from its last place
      expect(await chart.locator('.recharts-tooltip-wrapper').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    }

    if (isPhone(testInfo)) {
      await page.getByRole('heading', { name: 'Dashboard', level: 1 }).tap();
      await expect(chart.locator('.recharts-tooltip-wrapper')).toHaveCSS('visibility', 'hidden');
    }
  });

  test('the donut tooltip never covers the total in the middle', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signInAsDemo(page);
    const donut = page.locator('[data-card="dashboard.spendingByCategory"] [role="img"]');
    await donut.scrollIntoViewIfNeeded();
    await page.evaluate((top) => window.scrollBy(0, top - 260), (await box(donut)).top);
    // The total in the middle of the ring (the card of the tooltip has its own <strong> amount)
    const total = donut.locator('[class*="donutCenter"] strong');
    let shown = 0;
    for (const [fx, fy] of [[0.5, 0.05], [0.95, 0.5], [0.5, 0.95], [0.05, 0.5]]) {
      await point(page, testInfo, donut, fx, fy);
      const tip = donut.locator('.recharts-tooltip-wrapper > div');
      // The card comes with the next frame; a point between two slices shows none
      if (!(await tip.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false))) continue;
      shown += 1;
      expect(overlap(await box(tip), await box(total))).toBe(false);
    }
    expect(shown).toBeGreaterThan(0);
  });
});

test('no page scrolls sideways on a phone, in French, German and Vietnamese', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phones only');
  test.setTimeout(120000);
  await page.setViewportSize({ width: 360, height: 780 });
  await signInAsDemo(page);
  const paths = ['/', '/transactions', '/reports?tab=monthly', '/reports?tab=yearly', '/reports?tab=calendar', '/budgets', '/recurring', '/goals', '/wallets', '/categories', '/notifications', '/settings/profile'];
  for (const language of ['fr', 'de', 'vi']) {
    await useLanguage(page, language);
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const sideways = await page.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth);
      expect(sideways, `${language} ${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  }
});

test('the hero of a page keeps its size when the count arrives (Spanish, 1440 px)', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'The wide layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await signInAsDemo(page);
  await useLanguage(page, 'es');
  await page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fallback();
  });
  for (const path of ['/transactions', '/budgets', '/wallets']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__shift), `${path} jumped`).toBeLessThan(0.02);
  }
});

test('cards that rise on hover stay still when the mouse rests on their bottom edge', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'Hover needs a mouse');
  await signInAsDemo(page);
  for (const { path, selector } of [
    { path: '/reports?tab=monthly', selector: 'main section article' },
    { path: '/budgets', selector: 'main li > [data-spot]' },
  ]) {
    await page.goto(path);
    const card = page.locator(selector).first();
    await expect(card).toBeVisible();
    await page.waitForLoadState('networkidle');
    const b = await box(card);
    await page.mouse.move(b.left + b.width / 2, b.bottom - 1, { steps: 3 });
    // What the eye sees: the card rises once and stays up. A bounce goes up and down again and again, so its top
    // changes direction; count those turns over 1.5 s (moves under 0.1 px are rounding)
    const turns = await card.evaluate(
      (el) =>
        new Promise((resolve) => {
          let last = el.getBoundingClientRect().top;
          let direction = 0;
          let count = 0;
          const end = performance.now() + 1500;
          const tick = () => {
            const top = el.getBoundingClientRect().top;
            const step = top - last;
            if (Math.abs(step) > 0.1) {
              const now = Math.sign(step);
              if (direction && now !== direction) count += 1;
              direction = now;
              last = top;
            }
            if (performance.now() < end) requestAnimationFrame(tick);
            else resolve(count);
          };
          requestAnimationFrame(tick);
        })
    );
    expect(turns, `${path}: the card bounced`).toBe(0);
  }
});

test('at the end of a page the floating + covers nothing', async ({ page }, testInfo) => {
  await signInAsDemo(page);
  const sizes = isPhone(testInfo) ? [null] : [null, { width: 844, height: 390 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    for (const path of ['/notifications', '/transactions', '/']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
      const fab = await box(page.getByRole('button', { name: 'Quick add', exact: true }));
      const covered = await page.evaluate((f) => {
        const hits = [];
        for (const el of document.querySelectorAll('main button, main a, main input, main td, main strong, main span, main p, footer p')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || r.bottom > innerHeight || r.top < 0) continue;
          if (Math.min(r.right, f.right) - Math.max(r.left, f.left) > 1 && Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top) > 1) hits.push(el.textContent.trim().slice(0, 30));
        }
        return hits;
      }, fab);
      expect(covered, `${path}${size ? ` at ${size.width}x${size.height}` : ''}`).toEqual([]);
    }
  }
});

test.describe('the server waking up', () => {
  test('a stored session waits for the server, says so, and opens the page by itself when it answers', { tag: '@smoke' }, async ({ page }) => {
    await signInAsDemo(page);
    let down = true;
    await page.route('**/api/auth/me', (route) =>
      down ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false,"message":"Service unavailable"}' }) : route.fallback()
    );
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: 'Waiting for the server', level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/transactions$/);
    down = false;
    await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible({ timeout: 15000 });
  });

  test('a slow answer says that the server is starting', async ({ page }) => {
    await signInAsDemo(page);
    await page.route('**/api/auth/me', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      await route.fallback();
    });
    await page.goto('/');
    await expect(page.getByRole('status').filter({ hasText: 'Starting the server' })).toBeVisible({ timeout: 7500 });
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible({ timeout: 15000 });
  });
});

test('a page whose code cannot be downloaded offline opens by itself when the network is back', async ({ page, context }, testInfo) => {
  await signInAsDemo(page);
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  const menu = page.getByRole('button', { name: 'Open menu' });
  if (isPhone(testInfo)) await menu.click();
  // Goals was never opened: its code is not in the browser yet
  await page.getByRole('link', { name: 'Goals' }).first().click();
  await expect(page.getByRole('heading', { name: 'Something went wrong', level: 1 })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('heading', { name: 'Goals', level: 1 })).toBeVisible({ timeout: 15000 });
});

test('on a tablet the users table of the admin scrolls inside its card, not the whole page', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'The tablet width of the desktop layout');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@e2e.test');
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('a page nobody touches stops its endless decorations after 8 s, and they go on with the next input', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  // The real motion of the page (the tests run with reduced motion elsewhere, which stops the decorations anyway)
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await signInAsDemo(page);
  const light = page.locator('main [aria-hidden="true"] > span[class*="blob"]').first();
  await expect(light).toBeAttached();
  const state = () => light.evaluate((el) => getComputedStyle(el).animationPlayState);
  const idle = () => page.evaluate(() => document.documentElement.hasAttribute('data-idle'));

  // Moving while the page is used
  if (isPhone(testInfo)) await page.touchscreen.tap(5, 300);
  else await page.mouse.move(400, 300);
  expect(await idle()).toBe(false);
  expect(await state()).toBe('running');

  // No input for 8 s: the lights wait where they are
  await expect.poll(idle, { timeout: 12000, intervals: [1000] }).toBe(true);
  expect(await state()).toBe('paused');

  // The next input: they go on
  if (isPhone(testInfo)) await page.touchscreen.tap(5, 320);
  else await page.mouse.move(420, 320);
  await expect.poll(idle).toBe(false);
  expect(await state()).toBe('running');
});

// ---------- Large and long data (a new account filled through the API) ----------

// The API started by playwright.config.js (in-memory database)
const API_URL = 'http://localhost:4100/api';

async function registerFresh(page, testInfo, label) {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Audit Tester');
  await page.getByLabel('Email').fill(`e2e-audit-${label}-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Calls the API as the signed-in user, for the setup that is not what the test is about
async function apiCall(page, method, path, data) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.fetch(`${API_URL}${path}`, { method, data, headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok(), `${method} ${path}`).toBe(true);
  return (await response.json()).data;
}

const sidewaysScroll = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth);

test('a very large amount stays inside its pane of the Dashboard hero, on a phone and on a wide screen', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(isPhone(testInfo) ? { width: 360, height: 780 } : { width: 1440, height: 900 });
  await registerFresh(page, testInfo, 'big-amount');
  const categories = await apiCall(page, 'GET', '/categories');
  const food = categories.find((c) => c.name === 'Food');
  const salary = categories.find((c) => c.name === 'Salary');
  await apiCall(page, 'POST', '/transactions', { categoryId: food._id, amount: 999999999999, note: 'huge' });
  await apiCall(page, 'POST', '/transactions', { categoryId: salary._id, amount: 9871116000, note: 'income' });
  await page.reload();
  const balance = page.getByTestId('stat-balance');
  await expect(balance).toContainText('-990,128,883,999');
  await expect(page.getByTestId('stat-expense')).toContainText('999,999,999,999');

  expect(await sidewaysScroll(page)).toBeLessThanOrEqual(1);
  // The box of the digits themselves (they can run out of the box of their element)
  const digits = (locator) => locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
  for (const id of ['stat-balance', 'stat-income', 'stat-expense']) {
    const value = await digits(page.getByTestId(id));
    const pane = await box(page.getByTestId(id).locator('xpath=ancestor::article[1]'));
    expect(value.right, `${id} leaves its pane`).toBeLessThanOrEqual(pane.right + 1);
    expect(value.left).toBeGreaterThanOrEqual(pane.left - 1);
  }
  const incomePane = await box(page.getByTestId('stat-income').locator('xpath=ancestor::article[1]'));
  expect(overlap(await digits(balance), incomePane), 'the balance runs over the income pane').toBe(false);
});

test('one long word in a category name breaks inside its budget card instead of running under the buttons', async ({ page }, testInfo) => {
  if (isPhone(testInfo)) await page.setViewportSize({ width: 360, height: 780 });
  await registerFresh(page, testInfo, 'long-word');
  const name = 'Gesundheitsvorsorgeleistungen';
  const category = await apiCall(page, 'POST', '/categories', { name, type: 'expense', color: '#0EA5E9' });
  const month = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
  await apiCall(page, 'POST', '/budgets', { categoryId: category._id, month, amount: 1000000 });
  await page.goto('/budgets');
  const card = page.locator('main li').filter({ hasText: name });
  await expect(card).toBeVisible();
  const title = await box(card.getByText(name, { exact: true }));
  for (const button of await card.getByRole('button').filter({ visible: true }).all()) {
    expect(overlap(title, await box(button)), `the name runs under "${await button.getAttribute('aria-label')}"`).toBe(false);
  }
  expect(await sidewaysScroll(page)).toBeLessThanOrEqual(1);
});

test('Profile: the tabs of the avatar groups never make the page scroll sideways (Vietnamese, French, Spanish)', async ({ page }, testInfo) => {
  // The demo account has no avatar choices: a new account
  await page.setViewportSize(isPhone(testInfo) ? { width: 360, height: 780 } : { width: 1024, height: 768 });
  await registerFresh(page, testInfo, 'avatar-tabs');
  for (const language of ['vi', 'fr', 'es']) {
    await useLanguage(page, language);
    await page.goto('/settings/profile');
    const tabs = page.locator('main [role="group"]').filter({ has: page.locator('button[aria-pressed]') }).first();
    await expect(tabs).toBeVisible();
    expect(await sidewaysScroll(page), `${language}: the page scrolls sideways`).toBeLessThanOrEqual(1);
    // Every tab can still be reached: the last one is scrolled into view inside its row
    const last = tabs.getByRole('button').last();
    await last.scrollIntoViewIfNeeded();
    const card = await box(tabs.locator('xpath=..'));
    const tab = await box(last);
    expect(tab.right, `${language}: the last tab stays out of reach`).toBeLessThanOrEqual(card.right + 1);
  }
});

test('Categories: with many categories the form is not pushed down when the list arrives (1060 px)', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'The one-column layout of a narrow desktop window');
  await page.setViewportSize({ width: 1060, height: 800 });
  await registerFresh(page, testInfo, 'many-categories');
  for (let i = 1; i <= 24; i += 1) {
    await apiCall(page, 'POST', '/categories', { name: `Category number ${i}`, type: 'expense', color: '#0EA5E9' });
  }
  await page.addInitScript(() => {
    window.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  // A slow answer, as on the free server: the loading state stays on screen for a while
  await page.route('**/api/categories**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fallback();
  });
  await page.goto('/categories');
  await expect(page.getByText('Category number 24')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__shift)).toBeLessThan(0.05);
});

test('on a tablet the whole breadcrumb is readable: above the page with the sidebar open, in the top bar otherwise (German)', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'The tablet width of the desktop layout');
  const CRUMBS = { name: 'Brotkrümelnavigation' }; // the label of the breadcrumb in German
  const trail = page.getByRole('navigation', CRUMBS);
  // Every name whole (no "…"), and no name drawn over a › or another name
  async function readable() {
    return trail.evaluate((nav) => {
      const parts = [...nav.querySelectorAll('li > a, li > span')].filter((el) => el.getClientRects().length);
      const cut = parts.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent);
      const boxes = parts.map((el) => el.getBoundingClientRect());
      let overlaps = 0;
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const [a, b] = [boxes[i], boxes[j]];
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps += 1;
        }
      }
      return { cut, overlaps, lines: Math.round(nav.querySelector('ol').getBoundingClientRect().height) };
    });
  }

  await page.setViewportSize({ width: 768, height: 1024 });
  await signInAsDemo(page);
  await useLanguage(page, 'de');
  for (const path of ['/reports?tab=monthly', '/notifications', '/settings/security']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    // The sidebar is open: the top bar has no room, the trail is above the page
    await expect(page.locator('main').getByRole('navigation', CRUMBS)).toBeVisible();
    await expect(page.locator('header').getByRole('navigation', CRUMBS)).toHaveCount(0);
    expect(await readable(), path).toEqual({ cut: [], overlaps: 0, lines: 42 });
  }

  // The sidebar closed: room again in the top bar, and the trail goes back there, not under the search box
  await page.getByRole('button', { name: 'Seitenleiste einklappen' }).first().click();
  await page.goto('/reports?tab=monthly');
  await expect(page.locator('header').getByRole('navigation', CRUMBS)).toBeVisible();
  expect(await readable()).toEqual({ cut: [], overlaps: 0, lines: 42 });
  const search = await box(page.locator('header').getByRole('button').first());
  expect(overlap(await box(trail), search)).toBe(false);
});

test('the canonical link names the open public page, not the root of the site', async ({ page }) => {
  for (const path of ['/welcome', '/about', '/privacy', '/login']) {
    await page.goto(path);
    await expect(page.locator('main h1, h1').first()).toBeVisible();
    await expect.poll(() => page.locator('link[rel="canonical"]').evaluate((link) => new URL(link.href).pathname)).toBe(path);
  }
});
