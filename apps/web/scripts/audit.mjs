import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const base = process.env.AUDIT_BASE ?? 'http://127.0.0.1:4173';

// `redirect` documents the guard: a visitor landing on the account area must
// end up on the login screen.
const routes = [
  { path: '/' },
  { path: '/boutique' },
  { path: '/produit/luphera-noir' },
  { path: '/design-system' },
  { path: '/histoire' },
  { path: '/page-inconnue' },
  { path: '/connexion' },
  { path: '/inscription' },
  { path: '/mot-de-passe-oublie' },
  { path: '/reinitialiser-mot-de-passe' },
  { path: '/compte', redirect: '/connexion' },
];

const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

// A visitor has no session: `GET /me` answers 401 by design and the browser
// logs it as a resource error. That one is expected, nothing else is.
const isExpectedError = (text) => /401 \(Unauthorized\)/.test(text);

let failures = 0;

for (const size of sizes) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !isExpectedError(message.text())) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle' });

    // The storefront renders a loading shell first: wait for the page heading,
    // then for the guard redirect when the route is protected.
    await page
      .locator('h1')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => null);
    if (route.redirect !== undefined) {
      await page
        .waitForURL(`**${route.redirect}**`, { timeout: 10_000 })
        .catch(() => null);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const h1 = await page.locator('h1').count();
    const url = new URL(page.url());
    const redirected = route.redirect === undefined || url.pathname === route.redirect;

    const ok =
      response?.status() === 200 && errors.length === 0 && overflow <= 0 && h1 === 1 && redirected;
    if (!ok) failures += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${size.width} ${route.path} status=${response?.status()} overflow=${overflow} h1=${h1} url=${url.pathname} errors=${JSON.stringify(errors)}`,
    );
    await page.close();
  }
}

await browser.close();
process.exit(failures === 0 ? 0 : 1);
