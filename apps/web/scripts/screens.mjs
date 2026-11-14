import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SCREEN_BASE ?? 'http://127.0.0.1:4173';
const out = path.resolve('../../docs/screens');

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

const shots = [
  { name: 'home-1440', url: '/', width: 1440, height: 900 },
  { name: 'home-390', url: '/', width: 390, height: 844 },
  { name: 'shop-1440', url: '/boutique', width: 1440, height: 900 },
  { name: 'shop-390', url: '/boutique', width: 390, height: 844 },
  { name: 'product-1440', url: '/produit/luphera-noir', width: 1440, height: 900 },
  { name: 'product-390', url: '/produit/luphera-noir', width: 390, height: 844 },
  { name: 'design-system-1440', url: '/design-system', width: 1440, height: 900 },
  { name: 'design-system-390', url: '/design-system', width: 390, height: 844 },
];

for (const shot of shots) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  await page.goto(`${base}${shot.url}`, { waitUntil: 'networkidle' });

  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(out, `${shot.name}.png`), fullPage: true });
  await page.close();
}

await browser.close();
console.log(`Screens written to ${out}`);
