import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const base = process.env.AUDIT_BASE ?? 'http://127.0.0.1:4173';
const routes = ['/', '/boutique', '/produit/luphera-noir', '/design-system', '/histoire', '/page-inconnue'];
const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
let failures = 0;

for (const size of sizes) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const h1 = await page.locator('h1').count();

    const ok = response?.status() === 200 && errors.length === 0 && overflow <= 0 && h1 === 1;
    if (!ok) failures += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${size.width} ${route} status=${response?.status()} overflow=${overflow} h1=${h1} errors=${JSON.stringify(errors)}`,
    );
    await page.close();
  }
}

await browser.close();
process.exit(failures === 0 ? 0 : 1);
