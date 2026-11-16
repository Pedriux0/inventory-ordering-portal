// A11Y-03 (real keyboard) and A11Y-04 (Lighthouse) - proposal section 4.5, reqs 3.3.1 and 3.3.2
// runs a real Chrome/Chromium with Puppeteer:
//   A11Y-03 presses the real Tab / Enter keys: log in with the keyboard only, Tab through each page
//           and check every control is reached, open a form with Enter
//   A11Y-04 runs Lighthouse on the dashboard, products and orders pages: accessibility score >= 90
// reports: a11y/reports/lighthouse-*.html
//
// usage: node a11y/run-a11y.mjs [website url]   (default http://localhost:5173; the app must be
//        running with the demo data). Uses Chrome/Chromium/Brave, or the one in CHROME_PATH.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import lighthouse from 'lighthouse';

const BASE = (process.argv[2] || process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const REPORTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

const CHROME = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/brave-browser']
  .find((p) => p && fs.existsSync(p));
if (!CHROME) {
  console.error('No Chrome/Chromium found: set CHROME_PATH');
  process.exit(1);
}

const results = [];
function check(id, description, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${description}${detail ? `  (${detail})` : ''}`);
}

const PAGES_TO_TAB = ['/', '/products', '/orders', '/requests', '/users', '/profile'];
const LIGHTHOUSE_PAGES = [['dashboard', '/'], ['products', '/products'], ['orders', '/orders']];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // which element has the focus now (its id, or its text)
  const focused = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.id || (el.textContent || '').trim().slice(0, 40) || el.tagName : '';
    });
  async function tabUntil(test, maxPresses = 60) {
    for (let i = 0; i < maxPresses; i += 1) {
      await page.keyboard.press('Tab');
      if (await test(await focused())) return true;
    }
    return false;
  }

  // ---------- A11Y-03: log in with the keyboard only ----------
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  const reachedEmail = await tabUntil((f) => f === 'email', 10);
  await page.keyboard.type('admin@demo.com');
  await page.keyboard.press('Tab');
  const onPassword = (await focused()) === 'password';
  await page.keyboard.type('DemoAdminPass2026');
  await page.keyboard.press('Enter');
  const loggedIn = await page
    .waitForSelector('[data-cy=user-role]', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check('A11Y-03', 'log in with the keyboard only (Tab, type, Enter)', reachedEmail && onPassword && loggedIn);

  // ---------- A11Y-03: Tab reaches every control on each page ----------
  for (const pagePath of PAGES_TO_TAB) {
    await page.goto(BASE + pagePath, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    // number every visible, usable control; each Tab press records the number of the focused one
    const total = await page.evaluate(() => {
      const controls = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter(
        (el) => !el.disabled && el.offsetParent !== null && el.tabIndex >= 0
      );
      controls.forEach((el, i) => el.setAttribute('data-a11y', String(i)));
      document.activeElement && document.activeElement.blur();
      return controls.length;
    });
    const reached = new Set();
    for (let i = 0; i < total + 10; i += 1) {
      await page.keyboard.press('Tab');
      const n = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-a11y'));
      if (n !== null) reached.add(Number(n));
    }
    const missing = await page.evaluate(
      (seen) =>
        [...document.querySelectorAll('[data-a11y]')]
          .filter((el) => !seen.includes(Number(el.getAttribute('data-a11y'))))
          .map((el) => el.outerHTML.slice(0, 60)),
      [...reached]
    );
    check('A11Y-03', `Tab reaches all ${total} controls on ${pagePath}`, missing.length === 0, missing.join(' | '));
  }

  // ---------- A11Y-03: open a form with Enter ----------
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle0' });
  const onNewButton = await tabUntil((f) => /New product/.test(f));
  await page.keyboard.press('Enter');
  const formOpened = await page
    .waitForSelector('#productName', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  check('A11Y-03', 'open the new-product form with Tab + Enter', onNewButton && formOpened);

  // ---------- A11Y-04: Lighthouse on dashboard, products, orders ----------
  for (const [name, pagePath] of LIGHTHOUSE_PAGES) {
    const result = await lighthouse(
      BASE + pagePath,
      {
        output: ['html', 'json'],
        logLevel: 'error',
        onlyCategories: ['accessibility', 'best-practices', 'performance', 'seo'],
        disableStorageReset: true, // keep the login (it lives in this tab's sessionStorage)
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1280, height: 800, deviceScaleFactor: 1, disabled: false },
        throttlingMethod: 'provided',
      },
      undefined,
      page
    );
    fs.writeFileSync(path.join(REPORTS, `lighthouse-${name}.html`), result.report[0]);
    const score = (category) => Math.round((result.lhr.categories[category]?.score ?? 0) * 100);
    const accessibility = score('accessibility');
    check(
      'A11Y-04',
      `Lighthouse accessibility score on ${name} >= 90`,
      accessibility >= 90,
      `accessibility ${accessibility}, best practices ${score('best-practices')}, SEO ${score('seo')}, performance ${score('performance')}`
    );
  }
} finally {
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${results.length - failed} of ${results.length} checks passed (reports in a11y/reports/)`);
process.exit(failed ? 1 : 0);
