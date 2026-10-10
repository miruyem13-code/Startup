import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://localhost:5173/explore');
await page.locator('.bike-marker').first().waitFor();
await page.waitForTimeout(3000);
console.log(
  await page.evaluate(() => ({
    marker: [...document.querySelectorAll('.bike-marker')].slice(0, 3).map((e) => ({
      label: e.ariaLabel,
      bounds: JSON.stringify(e.getBoundingClientRect()),
      display: getComputedStyle(e).display,
      transform: getComputedStyle(e).transform,
    })),
    canvas: [...document.querySelectorAll('canvas')].map((e) => ({
      width: e.width,
      height: e.height,
      bounds: JSON.stringify(e.getBoundingClientRect()),
    })),
    worker: performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('worker'))
      .map((r) => r.name),
  })),
);
console.log(errors.slice(0, 12));
await page.screenshot({ path: 'docs/screenshots/map-desktop.png', fullPage: true });
await browser.close();
