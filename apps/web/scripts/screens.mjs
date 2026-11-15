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

/**
 * Phase 2 screens need state, so they replay the purchase flow at each width.
 * The database must be freshly seeded: the screenshots then show real totals
 * computed by the API, never hand-written amounts.
 */
async function fullShot(page, file) {
  // The site header is fixed: on a full-page capture it would land in the
  // middle of the document. Pin it to the top for the screenshot only.
  await page.addStyleTag({
    content:
      'header.fixed{position:static !important;background:none !important} a[href="#contenu"]{display:none !important}',
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: file, fullPage: true });
}

async function captureFlow(width, height, suffix) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  await page.goto(`${base}/produit/luphera-noir`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Ajouter au panier', exact: true }).first().click();

  const drawer = page.getByRole('dialog');
  await drawer.getByText('Luphéra Noir').first().waitFor({ state: 'visible' });
  await drawer.getByRole('textbox', { name: 'Code promo' }).fill('LUPHERA10');
  await drawer.getByRole('button', { name: 'Appliquer' }).click();
  await drawer.getByText('Code LUPHERA10 appliqué.').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(out, `cart-${suffix}.png`) });

  await drawer.getByRole('link', { name: 'Passer commande' }).click();
  await page.waitForURL('**/commande');
  await page.getByRole('heading', { name: 'Finaliser la commande' }).waitFor();

  await page.getByLabel('Nom complet').fill('Salma Bennani');
  await page.getByLabel('Téléphone').fill('0612345678');
  await page.getByLabel('Ville').selectOption('casablanca');
  await page.getByLabel('Quartier').fill('Maarif');
  await page.getByLabel('Adresse', { exact: true }).fill('12 rue des Orangers');
  await page.getByLabel('Repère (facultatif)').fill('En face de la pharmacie');
  await page.getByLabel("J'accepte les conditions générales de vente.").check();
  await page.waitForTimeout(300);

  await fullShot(page, path.join(out, `checkout-${suffix}.png`));

  await page.getByRole('button', { name: 'Confirmer la commande' }).click();
  await page.waitForURL('**/commande/confirmation/LPH-**');
  await page.getByRole('heading', { name: 'Commande enregistrée' }).waitFor();
  await page.waitForTimeout(400);

  await fullShot(page, path.join(out, `confirmation-${suffix}.png`));

  await page.getByRole('link', { name: 'Suivre ma commande' }).click();
  await page.waitForURL('**/suivi**');
  await page.getByLabel('Téléphone').fill('0612345678');
  await page.getByRole('button', { name: 'Afficher la commande' }).click();
  await page.getByRole('heading', { name: 'Historique' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);

  await fullShot(page, path.join(out, `tracking-${suffix}.png`));
  await page.close();
}

await captureFlow(1440, 900, '1440');
await captureFlow(390, 844, '390');

await browser.close();
console.log(`Screens written to ${out}`);

