import { expect, test } from '@playwright/test';

// The logo: it turns by itself, the mouse changes how it moves, a press tosses it, and reduced motion keeps it still.
const logoOf = (page) => page.getByRole('img', { name: 'Ledgerling' }).first();

// How many of its endless animations are running now (the slow turn, the band of light, the fast turn)
const runningTurns = (logo) =>
  logo.evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) => animation.effect.getTiming().iterations === Infinity && animation.playState === 'running').length,
  );

// How far the L of the front plate at the top left has moved out
const openedBy = (logo) =>
  logo.evaluate((element) => {
    const piece = element.querySelectorAll('svg')[2].querySelector('[data-piece="0"]');
    return Math.abs(new DOMMatrix(getComputedStyle(piece).transform).m41);
  });

test('the mouse opens the coin and spins it faster, and it closes again without the mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a phone has no mouse');
  await page.goto('/about');
  const logo = logoOf(page);
  await expect(logo).toBeVisible();

  const atRest = await runningTurns(logo);
  expect(atRest).toBeGreaterThan(0);
  expect(await openedBy(logo)).toBe(0);

  await logo.hover();
  await expect.poll(() => runningTurns(logo)).toBeGreaterThan(atRest);
  await expect.poll(() => openedBy(logo)).toBeGreaterThan(2);

  await page.mouse.move(0, 0);
  await expect.poll(() => runningTurns(logo)).toBe(atRest);
  await expect.poll(() => openedBy(logo)).toBeLessThan(0.01);
});

test('a press tosses the coin once and it lands back in its place', async ({ page }) => {
  await page.goto('/about');
  const logo = logoOf(page);
  await expect(logo).toBeVisible();
  const tossing = logo.locator('[data-tossing]');

  // Only the press: a full click would follow the link of the logo
  await logo.dispatchEvent('pointerdown');
  await expect(tossing).toHaveCount(1);
  await expect(tossing).toHaveCount(0, { timeout: 5000 });
});

test('with reduced motion the coin stands still and a press does nothing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/about');
  const logo = logoOf(page);
  await expect(logo).toBeVisible();

  expect(await runningTurns(logo)).toBe(0);
  await logo.dispatchEvent('pointerdown');
  await expect(logo.locator('[data-tossing]')).toHaveCount(0);
});
