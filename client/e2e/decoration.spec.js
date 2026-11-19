import { expect, test } from '@playwright/test';

// The endless decoration (the lights of the aurora, the turning logo) must stay cheap for the GPU of a big screen:
// - a light is blurred inside a box that only moves, so the blur is painted once instead of on every frame;
// - the slow moves go in small steps, so the screen changes 30 times a second for them, not at every refresh;
// - out of the window it waits, and it goes on from the same place when it comes back.
// The landing page has all of it: the hero at the top, the closing section and the footer at the bottom.

const lightsOf = (section) => section.locator(':scope > span[aria-hidden="true"] > span');
const heroLights = (page) => lightsOf(page.locator('section[aria-labelledby="welcome-title"]'));
const closingLights = (page) => lightsOf(page.locator('section[aria-labelledby="welcome-closing"]'));
// The slow turn of the coin: the logo's coin (data-testid="logo-coin") holds the tilt, which holds the turn
const footerTurn = (page) => page.locator('footer [data-testid="logo-coin"] > span > span');

// The play state of the drift of each light on screen (a phone hides one of the hero lights)
const lightStates = (lights) =>
  lights.evaluateAll((spans) => spans.filter((span) => getComputedStyle(span).display !== 'none').map((span) => span.getAnimations()[0]?.playState));
const turnState = (turn) => turn.evaluate((span) => span.getAnimations()[0]?.playState);

const scrollTo = (page, where) =>
  page.evaluate((bottom) => window.scrollTo(0, bottom ? document.documentElement.scrollHeight : 0), where === 'bottom');

test('a light of the aurora is blurred inside a box that only moves, in small steps, like the slow turn of the logo', async ({ page }) => {
  await page.goto('/welcome');
  const light = heroLights(page).first();
  await expect(light).toBeAttached();

  const style = await light.evaluate((span) => ({
    filter: getComputedStyle(span).filter,
    timing: getComputedStyle(span).animationTimingFunction,
    inner: getComputedStyle(span, '::before').filter,
  }));
  expect(style.filter).toBe('none');
  expect(style.inner).toContain('blur(');
  expect(style.timing).toMatch(/^steps\(/);

  expect(await footerTurn(page).evaluate((span) => getComputedStyle(span).animationTimingFunction)).toMatch(/^steps\(/);
});

test('the aurora and the logo wait while they are out of the window and go on when they come back', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // At the top: the hero moves; the closing section and the footer are further down, out of the window
  await expect.poll(async () => [...new Set(await lightStates(heroLights(page)))]).toEqual(['running']);
  await expect.poll(async () => [...new Set(await lightStates(closingLights(page)))]).toEqual(['paused']);
  await expect.poll(() => turnState(footerTurn(page))).toBe('paused');

  await scrollTo(page, 'bottom');
  await expect.poll(async () => [...new Set(await lightStates(heroLights(page)))]).toEqual(['paused']);
  await expect.poll(async () => [...new Set(await lightStates(closingLights(page)))]).toEqual(['running']);
  await expect.poll(() => turnState(footerTurn(page))).toBe('running');

  await scrollTo(page, 'top');
  await expect.poll(async () => [...new Set(await lightStates(heroLights(page)))]).toEqual(['running']);
});
