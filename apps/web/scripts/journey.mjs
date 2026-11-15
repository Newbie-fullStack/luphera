import { chromium } from '@playwright/test';

/**
 * Full purchase journey, at a phone width and a desktop width.
 *
 * It expects a freshly seeded database (php artisan migrate:fresh --seed) and
 * a running storefront whose /api proxy points at the Laravel API.
 */
const base = process.env.JOURNEY_BASE ?? 'http://127.0.0.1:5180';
const sizes = [
  { width: 360, height: 740, label: 'mobile' },
  { width: 1440, height: 900, label: 'desktop' },
];

let failures = 0;

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.log(`FAIL ${message}`);
    return;
  }

  console.log(`PASS ${message}`);
}

const browser = await chromium.launch({ channel: 'chrome' });

for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    reducedMotion: 'reduce',
  });

  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const prefix = `[${size.label} ${size.width}]`;

  try {
    await page.goto(`${base}/produit/luphera-noir`, { waitUntil: 'networkidle' });

    const addButton = page.getByRole('button', { name: 'Ajouter au panier', exact: true }).first();
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    const drawer = page.getByRole('dialog');
    await drawer.waitFor({ state: 'visible' });
    await drawer.getByText('Luphéra Noir').first().waitFor({ state: 'visible' });
    check(true, `${prefix} drawer shows the bottle`);

    const badge = page.locator('header b').first();
    await page.waitForFunction(() => {
      const node = document.querySelector('header b');
      return node !== null && node.textContent?.trim() === '1';
    });
    check((await badge.textContent())?.trim() === '1', `${prefix} header badge counts one item`);

    await drawer.getByRole('textbox', { name: 'Code promo' }).fill('LUPHERA10');
    await drawer.getByRole('button', { name: 'Appliquer' }).click();
    await drawer.getByText('Code LUPHERA10 appliqué.').waitFor({ state: 'visible' });
    check(true, `${prefix} coupon applied`);

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

    const submit = page.getByRole('button', { name: 'Confirmer la commande' });
    check(await submit.isEnabled(), `${prefix} submit enabled`);
    await submit.click();

    await page.waitForURL('**/commande/confirmation/LPH-**', { timeout: 20_000 });
    await page.getByRole('heading', { name: 'Commande enregistrée' }).waitFor();

    const number = page.url().split('/').pop() ?? '';
    check(/^LPH-\d{6}-\d{4}$/.test(number), `${prefix} order number ${number}`);

    const body = await page.locator('body').innerText();
    check(body.includes('Salma Bennani'), `${prefix} confirmation shows the customer`);
    check(body.includes('Paiement à la livraison') || body.includes('En attente de confirmation'), `${prefix} confirmation shows the status`);

    await page.getByRole('link', { name: 'Suivre ma commande' }).click();
    await page.waitForURL('**/suivi**');
    await page.getByLabel('Téléphone').fill('0612345678');
    await page.getByRole('button', { name: 'Afficher la commande' }).click();
    await page.getByRole('heading', { name: 'Historique' }).waitFor({ state: 'visible' });
    check(true, `${prefix} public tracking found the order`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(overflow <= 0, `${prefix} no horizontal overflow (${overflow})`);
    check(errors.length === 0, `${prefix} no console errors ${JSON.stringify(errors)}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${prefix} ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
process.exit(failures === 0 ? 0 : 1);
