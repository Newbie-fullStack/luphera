import { chromium } from '@playwright/test';

/**
 * Back-office smoke audit.
 *
 * Runs against the Vite dev server (5174) with the API on 8000. It checks the
 * four phase 4 exit criteria: a support cannot change the catalogue, a support
 * confirms an order, a manager ships it, and every console screen renders
 * without overflow or console error at both widths.
 */
const base = process.env.ADMIN_AUDIT_BASE ?? 'http://localhost:5174';
const api = process.env.ADMIN_AUDIT_API ?? 'http://127.0.0.1:8000/api/v1';

const isExpectedError = (text) => /40[13] \((Unauthorized|Forbidden)\)/.test(text);

let failures = 0;

function check(condition, label, detail = '') {
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : ` ${detail}`}`);
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  });

  return { status: response.status, body: await response.json() };
}

/**
 * Creates a real pending order through the public API so the console has
 * something to confirm and ship.
 */
async function createOrder() {
  const cart = await apiJson('/cart');
  const token = cart.body.meta.cart_token;
  const product = await apiJson('/products/luphera-noir');
  const variant = product.body.data.variants[0].id;

  await apiJson('/cart/items', {
    method: 'POST',
    headers: { 'X-Cart-Token': token },
    body: JSON.stringify({ variant_id: variant, quantity: 1 }),
  });

  const order = await apiJson('/orders', {
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

  if (order.status !== 201) {
    throw new Error(`Order creation failed: ${JSON.stringify(order.body)}`);
  }

  return order.body.data.number;
}

async function login(page, identifier) {
  await page.goto(`${base}/connexion`, { waitUntil: 'networkidle' });
  await page.getByLabel('Téléphone ou e-mail').fill(identifier);
  await page.getByLabel('Mot de passe').fill('password');
  await page.getByRole('button', { name: 'Entrer dans la console' }).click();
  await page.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 20_000 });
}

async function logout(page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForURL('**/connexion');
}

async function setStatus(page, target, badge) {
  await page.getByLabel('Statut').selectOption(target);

  if (target === 'shipped') {
    await page.getByLabel('Transporteur').fill('Amana');
    await page.getByLabel('N° de suivi').fill('AMN-123456');
  }

  await page
    .getByRole('button', {
      name: target === 'confirmed' ? 'Confirmer la commande' : 'Changer le statut',
    })
    .click();

  await page.locator('.badge', { hasText: badge }).first().waitFor({ timeout: 15_000 });
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !isExpectedError(message.text())) {
    consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

const orderNumber = await createOrder();

// ---------------------------------------------------------------- support
await login(page, 'support@luphera.test');

check(
  (await page.getByRole('heading', { name: 'Tableau de bord' }).count()) === 1,
  'support lands on the dashboard',
);

await page.goto(`${base}/commandes/${orderNumber}`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: orderNumber }).waitFor();
await setStatus(page, 'confirmed', 'Confirmée');
check(true, 'support confirms an order from the console');

await page.goto(`${base}/produits`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Produits' }).waitFor();
check(
  (await page.getByRole('link', { name: 'Nouveau produit' }).count()) === 0,
  'support sees no create-product action',
);

await page.goto(`${base}/produits/nouveau`, { waitUntil: 'networkidle' });
await page.getByText('Accès refusé').first().waitFor({ timeout: 10_000 });
check(true, 'support is refused the product editor');

await page.goto(`${base}/stock`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Stock' }).waitFor();
check(
  (await page.getByRole('button', { name: 'Ajuster' }).count()) === 0,
  'support sees the stock console without adjustment actions',
);

await logout(page);

// ---------------------------------------------------------------- manager
await login(page, 'manager@luphera.test');

await page.goto(`${base}/commandes/${orderNumber}`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: orderNumber }).waitFor();
await setStatus(page, 'preparing', 'En préparation');
await setStatus(page, 'shipped', 'Expédiée');
await page.getByText('AMN-123456').waitFor();
check(true, 'manager prepares then ships the order with tracking');

// Dynamic ids for the detail screens, read through the authenticated session.
const products = await page.evaluate(async () => {
  const response = await fetch('/api/v1/admin/products', {
    headers: { Accept: 'application/json' },
  });

  return response.json();
});
const customers = await page.evaluate(async () => {
  const response = await fetch('/api/v1/admin/customers', {
    headers: { Accept: 'application/json' },
  });

  return response.json();
});

const productId = products.data?.[0]?.id;
const customerId = customers.data?.[0]?.id;

const routes = [
  { path: '/', title: 'Tableau de bord' },
  { path: '/commandes', title: 'Commandes' },
  { path: `/commandes/${orderNumber}`, title: orderNumber },
  { path: '/produits', title: 'Produits' },
  ...(productId === undefined ? [] : [{ path: `/produits/${productId}`, title: 'Modifier le produit' }]),
  { path: '/stock', title: 'Stock' },
  { path: '/clients', title: 'Clients' },
  ...(customerId === undefined ? [] : [{ path: `/clients/${customerId}`, title: 'Fiche client' }]),
  { path: '/coupons', title: 'Coupons' },
  { path: '/pages', title: 'Pages' },
  { path: '/parametres', title: 'Paramètres' },
  { path: '/journal', title: 'Journal' },
];

const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

for (const size of sizes) {
  await page.setViewportSize(size);

  for (const route of routes) {
    const errors = [];
    const onConsole = (message) => {
      if (message.type() === 'error' && !isExpectedError(message.text())) {
        errors.push(message.text());
      }
    };
    page.on('console', onConsole);

    const response = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });
    await page
      .locator('h1')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => null);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const h1 = await page.locator('h1').count();
    const ok = response?.status() === 200 && errors.length === 0 && overflow <= 0 && h1 === 1;

    page.off('console', onConsole);
    check(
      ok,
      `${size.width} ${route.path}`,
      `status=${response?.status()} overflow=${overflow} h1=${h1} errors=${JSON.stringify(errors)}`,
    );
  }
}

await browser.close();

check(consoleErrors.length === 0, 'no unexpected console error', JSON.stringify(consoleErrors));

process.exit(failures === 0 ? 0 : 1);
