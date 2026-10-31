// npm run og-image
// Opens scripts/og-image.html in Playwright and saves a 1200 x 630 picture as public/og-image.png.
// That picture is what shows when the site link is shared (the Open Graph and Twitter tags in index.html).
import { chromium } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = pathToFileURL(join(here, 'og-image.html')).href;
const output = join(here, '..', 'public', 'og-image.png');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(source, { waitUntil: 'load' });
  // The web font is requested from Google Fonts; offline, the page falls back to the system font
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`Saved ${output}`);
} finally {
  await browser.close();
}
