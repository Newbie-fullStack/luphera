import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SCREEN_BASE ?? 'http://localhost:4173';
const apiBase = process.env.ADMIN_API ?? 'http://127.0.0.1:8000/api/v1';
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
  {
    name: 'reviews-1440',
    url: '/produit/luphera-noir',
    width: 1440,
    height: 900,
    anchor: '#reviews-title',
    fullPage: false,
    phase: 5,
  },
  {
    name: 'reviews-390',
    url: '/produit/luphera-noir',
    width: 390,
    height: 844,
    anchor: '#reviews-title',
    fullPage: false,
    phase: 5,
  },
  { name: 'contact-1440', url: '/contact', width: 1440, height: 900, phase: 5 },
  { name: 'contact-390', url: '/contact', width: 390, height: 844, phase: 5 },
  { name: 'histoire-1440', url: '/histoire', width: 1440, height: 900, phase: 5 },
  { name: 'histoire-390', url: '/histoire', width: 390, height: 844, phase: 5 },
  { name: 'design-system-1440', url: '/design-system', width: 1440, height: 900 },
  { name: 'design-system-390', url: '/design-system', width: 390, height: 844 },
];

// SCREEN_FLOW=account captures only the account pages, SCREEN_FLOW=flow only
// the purchase journey, SCREEN_FLOW=admin only the back-office, SCREEN_FLOW=content
// only the phase 5 storefront screens. Unset means the storefront (the make target).
const flow = process.env.SCREEN_FLOW ?? 'all';

/**
 * The house page is seeded as a draft on purpose. A screenshot of the CMS has
 * to show a real published page, so this logs in through the API and publishes
 * it the same way the console does. The body stays the "[à compléter]" seed
 * text: the capture never invents editorial copy.
 */
async function publishHousePage() {
  const apiOrigin = new URL(apiBase).origin;
  const origin = 'http://localhost:4173';
  const jar = new Map();

  const call = async (pathname, options = {}) => {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Origin: origin,
        Referer: `${origin}/`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(jar.size === 0
          ? {}
          : { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') }),
        ...(options.headers ?? {}),
      },
    });

    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(';')[0];
      const index = pair.indexOf('=');
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }

    return response;
  };

  await call('/sanctum/csrf-cookie');

  const csrf = () => decodeURIComponent(jar.get('XSRF-TOKEN') ?? '');

  const login = await call('/api/v1/admin/login', {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': csrf() },
    body: JSON.stringify({ identifier: 'admin@luphera.test', password: 'password' }),
  });

  if (!login.ok) {
    throw new Error(`admin login failed with ${login.status}`);
  }

  const pages = await (await call('/api/v1/admin/pages')).json();
  const page = pages.data.find((entry) => entry.slug === 'histoire');

  if (page === undefined) {
    throw new Error('the seeded house page is missing');
  }

  if (page.is_published) {
    return;
  }

  const patched = await call(`/api/v1/admin/pages/${page.id}`, {
    method: 'PATCH',
    headers: { 'X-XSRF-TOKEN': csrf() },
    body: JSON.stringify({ is_published: true }),
  });

  if (!patched.ok) {
    throw new Error(`publishing the house page failed with ${patched.status}`);
  }
}

if (flow === 'all' || flow === 'content') {
  await publishHousePage();
}

for (const shot of shots) {
  if (flow === 'content' && shot.phase !== 5) continue;
  if (flow !== 'all' && flow !== 'content') break;

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

  if (shot.anchor !== undefined) {
    await page.locator(shot.anchor).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: path.join(out, `${shot.name}.png`),
    fullPage: shot.fullPage ?? true,
  });
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

/**
 * Phase 3 screens need a real session. The flow registers a throw-away
 * customer, saves one address and one favourite, then captures the account
 * pages. Names and phones are generated so the captures stay reproducible.
 */
async function captureAccount(width, height, suffix) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  const stamp = String(Date.now()).slice(-8);
  const name = 'Salma Bennani';
  const phone = `06${String(Date.now()).slice(-8)}`;
  const email = `salma.${stamp}@example.ma`;
  const password = 'secret123';

  await page.goto(`${base}/connexion`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Connexion' }).waitFor({ state: 'visible' });
  await fullShot(page, path.join(out, `account-login-${suffix}.png`));

  await page.goto(`${base}/inscription`, { waitUntil: 'networkidle' });
  await page.getByLabel('Nom complet').fill(name);
  await page.getByLabel('Téléphone').fill(phone);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByLabel('Confirmer le mot de passe').fill(password);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();

  await page.waitForURL('**/compte', { timeout: 20_000 });
  await page.getByRole('heading', { name: `Bonjour ${name}` }).waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await fullShot(page, path.join(out, `account-profile-${suffix}.png`));

  await page.getByRole('link', { name: 'Commandes', exact: true }).click();
  await page.getByRole('heading', { name: 'Commandes' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await fullShot(page, path.join(out, `account-orders-${suffix}.png`));

  await page.getByRole('link', { name: 'Adresses', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter une adresse' }).click();
  await page.getByLabel('Libellé').fill('Maison');
  await page.getByLabel('Nom du destinataire').fill(name);
  await page.getByLabel('Téléphone').fill(phone);
  await page.getByLabel('Ville').selectOption('casablanca');
  await page.getByLabel('Quartier').fill('Maarif');
  await page.getByLabel('Adresse', { exact: true }).fill('12 rue des Orangers');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page
    .getByText('Par défaut', { exact: true })
    .waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(600);
  await fullShot(page, path.join(out, `account-addresses-${suffix}.png`));

  await page.goto(`${base}/produit/luphera-noir`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
  await page.getByRole('button', { name: 'Retirer des favoris' }).waitFor({ timeout: 10_000 });

  await page.goto(`${base}/compte/favoris`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Luphéra Noir', exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await fullShot(page, path.join(out, `account-wishlist-${suffix}.png`));

  await page.close();
}

/**
 * Phase 4 screens need a staff session. The database must be seeded with the
 * demo accounts (admin@luphera.test / password). A pending order is created
 * through the public API so the queue shows a real record, never a mock.
 */
const adminBase = process.env.ADMIN_BASE ?? 'http://localhost:5174';
const adminApi = apiBase;

async function adminJson(pathname, options = {}) {
  const response = await fetch(`${adminApi}${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  });

  return response.json();
}

async function createAdminOrder() {
  const cart = await adminJson('/cart');
  const token = cart.meta.cart_token;
  const product = await adminJson('/products/luphera-noir');

  await adminJson('/cart/items', {
    method: 'POST',
    headers: { 'X-Cart-Token': token },
    body: JSON.stringify({ variant_id: product.data.variants[0].id, quantity: 1 }),
  });

  const order = await adminJson('/orders', {
    method: 'POST',
    headers: { 'X-Cart-Token': token },
    body: JSON.stringify({
      customer_name: 'Salma Bennani',
      phone: '0612345678',
      city: 'casablanca',
      district: 'Maarif',
      address: '12 rue des Orangers',
      landmark: 'En face de la pharmacie',
      payment_method: 'cod',
      terms: true,
    }),
  });

  return order.data.number;
}

async function captureAdmin(width, height, suffix, full) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  const orderNumber = await createAdminOrder();

  const shot = async (name) => {
    await page
      .locator('h1')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => null);
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(out, `admin-${name}-${suffix}.png`) });
  };

  await page.goto(`${adminBase}/connexion`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Accès réservé' }).waitFor();
  await shot('login');

  await page.getByLabel('Téléphone ou e-mail').fill('admin@luphera.test');
  await page.getByLabel('Mot de passe').fill('password');
  await page.getByRole('button', { name: 'Entrer dans la console' }).click();
  await page.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 20_000 });
  await shot('dashboard');

  await page.goto(`${adminBase}/commandes`, { waitUntil: 'networkidle' });
  await shot('orders');

  await page.goto(`${adminBase}/commandes/${orderNumber}`, { waitUntil: 'networkidle' });
  await shot('order-detail');

  await page.goto(`${adminBase}/stock`, { waitUntil: 'networkidle' });
  await shot('stock');

  if (full) {
    const ids = await page.evaluate(async () => {
      const [products, customers] = await Promise.all([
        fetch('/api/v1/admin/products', { headers: { Accept: 'application/json' } }).then((r) =>
          r.json(),
        ),
        fetch('/api/v1/admin/customers', { headers: { Accept: 'application/json' } }).then((r) =>
          r.json(),
        ),
      ]);

      return {
        product: products.data?.[0]?.id ?? null,
        customer: customers.data?.[0]?.id ?? null,
      };
    });

    await page.goto(`${adminBase}/produits`, { waitUntil: 'networkidle' });
    await shot('products');

    if (ids.product !== null) {
      await page.goto(`${adminBase}/produits/${ids.product}`, { waitUntil: 'networkidle' });
      await shot('product-editor');
    }

    await page.goto(`${adminBase}/clients`, { waitUntil: 'networkidle' });
    await shot('customers');

    if (ids.customer !== null) {
      await page.goto(`${adminBase}/clients/${ids.customer}`, { waitUntil: 'networkidle' });
      await shot('customer-detail');
    }

    await page.goto(`${adminBase}/coupons`, { waitUntil: 'networkidle' });
    await shot('coupons');

    await page.goto(`${adminBase}/pages`, { waitUntil: 'networkidle' });
    await shot('pages');

    await page.goto(`${adminBase}/messages`, { waitUntil: 'networkidle' });
    await shot('messages');

    await page.goto(`${adminBase}/avis`, { waitUntil: 'networkidle' });
    await shot('reviews');

    await page.goto(`${adminBase}/parametres`, { waitUntil: 'networkidle' });
    await shot('settings');

    await page.goto(`${adminBase}/journal`, { waitUntil: 'networkidle' });
    await shot('audit');
  }

  await page.close();
}

if (flow === 'all' || flow === 'flow') {
  await captureFlow(1440, 900, '1440');
  await captureFlow(390, 844, '390');
}

if (flow === 'all' || flow === 'account') {
  await captureAccount(1440, 900, '1440');
  await captureAccount(390, 844, '390');
}

if (flow === 'admin') {
  await captureAdmin(1440, 900, '1440', true);
  await captureAdmin(390, 844, '390', false);
}

await browser.close();
console.log(`Screens written to ${out}`);
