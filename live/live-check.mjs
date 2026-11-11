// Live site check: the Milestone 3 behaviour, tested on the REAL deployed site
// run by .github/workflows/live-check.yml (the "Run workflow" button), or by hand:
//   node live/live-check.mjs https://inventoryorderingportal.cloud
//
// SAFE FOR PRODUCTION: it only reads data, plus requests the server must refuse before
// changing anything (Staff on admin endpoints, broken requests). It never creates, edits or
// deletes anything, so the live demo data stays exactly as it is. The tests that create data,
// attack the API or load the server run on GitHub's throwaway copy instead (tests.yml).
// Side effect: the refused requests are written to the audit log, as reqs 3.2.2 / 3.2.3 require.

const BASE = (process.argv[2] || process.env.LIVE_URL || 'https://inventoryorderingportal.cloud').replace(/\/$/, '');

// the demo accounts (already public in the README: fake data only)
const ACCOUNTS = {
  Admin: { email: 'admin@demo.com', password: 'DemoAdminPass2026' },
  Manager: { email: 'manager@demo.com', password: 'DemoManagerPass2026' },
  Staff: { email: 'staff@demo.com', password: 'DemoStaffPass2026' },
};

const results = [];
let slowest = 0;

function check(id, description, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(8)} ${description}${detail ? `  (${detail})` : ''}`);
}

// one request to the live site; returns { status, headers, body } and times it
async function call(method, path, { token, body, raw, headers = {}, redirect = 'follow' } = {}) {
  const started = Date.now();
  const res = await fetch(BASE + path, {
    method,
    redirect,
    headers: {
      ...(body !== undefined || raw ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  slowest = Math.max(slowest, Date.now() - started);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json (e.g. the website html) */
  }
  return { status: res.status, headers: res.headers, json, text };
}

// an error answer must be short and generic: no stack trace, no SQL, no file paths (SEC-05)
const leaksDetails = (text) => /(\bat .+\.js:\d+|stack|SELECT |INSERT |sql|ER_[A-Z_]+|node_modules|\/var\/www)/i.test(text);

console.log(`Live site check: ${BASE}\n`);

// ---------- the site is up ----------
const health = await call('GET', '/api/health');
check('UP', 'the API answers', health.status === 200 && health.json?.status === 'ok', `status ${health.status}`);

const plainHttp = await fetch(BASE.replace('https://', 'http://') + '/', { redirect: 'manual' });
check('HTTPS', 'plain http is sent to https', [301, 308].includes(plainHttp.status) && (plainHttp.headers.get('location') || '').startsWith('https://'), `status ${plainHttp.status}`);

const home = await call('GET', '/');
check('WEB', 'the website loads', home.status === 200 && home.text.includes('<div id="root">'), `status ${home.status}`);
const deepLink = await call('GET', '/products');
check('WEB', 'a page address opened directly also loads (/products)', deepLink.status === 200 && deepLink.text.includes('<div id="root">'));

// ---------- logins (FE-01 / API-01, API-02) ----------
const tokens = {};
for (const [role, { email, password }] of Object.entries(ACCOUNTS)) {
  const res = await call('POST', '/api/auth/login', { body: { email, password } });
  tokens[role] = res.json?.token;
  check('API-01', `${role} demo account logs in`, res.status === 200 && res.json?.user?.role === role, `status ${res.status}`);
}
const wrong = await call('POST', '/api/auth/login', { body: { email: ACCOUNTS.Staff.email, password: 'NotTheRightPassword1' } });
check('API-02', 'a wrong password is refused with a generic message', wrong.status === 401 && wrong.json?.error === 'Invalid email or password', `status ${wrong.status}`);
const staff = tokens.Staff;

// ---------- week 7: search, sort, pages ----------
const lamp = await call('GET', '/api/products?search=LAMP', { token: staff });
const lampNames = (lamp.json || []).map((p) => p.productName);
check('API-05', 'search products by name, any upper/lower case (req 2.6.1)',
  lamp.status === 200 && lampNames.length > 0 && lampNames.every((n) => /lamp/i.test(n)),
  `"LAMP" found ${lampNames.length}: ${lampNames.join(', ')}`);

const all = await call('GET', '/api/products', { token: staff });
const someProduct = (all.json || [])[0];
if (someProduct) {
  const byId = await call('GET', `/api/products?search=${encodeURIComponent(`#${someProduct.productId}`)}`, { token: staff });
  check('API-05', 'search products by id: "#id" (req 2.6.1)',
    byId.status === 200 && (byId.json || []).some((p) => p.productId === someProduct.productId),
    `#${someProduct.productId} -> ${(byId.json || []).map((p) => p.productName).join(', ')}`);
}

for (const [sort, field] of [['price', 'unitPrice'], ['stock', 'currentStock'], ['name', 'productName']]) {
  const asc = await call('GET', `/api/products?sort=${sort}&order=asc`, { token: staff });
  const desc = await call('GET', `/api/products?sort=${sort}&order=desc`, { token: staff });
  const values = (r) => (r.json || []).map((p) => p[field]);
  const cmp = (a, b) => (typeof a === 'string' ? a.localeCompare(b, undefined, { sensitivity: 'base' }) : a - b);
  const inOrder = (list, dir) => list.every((v, i) => i === 0 || dir * cmp(list[i - 1], v) <= 0);
  check('FE-08', `sort products by ${sort}, ascending and descending (req 2.6.3)`,
    asc.status === 200 && desc.status === 200 && inOrder(values(asc), 1) && inOrder(values(desc), -1),
    `${sort} desc starts ${values(desc).slice(0, 3).join(', ')}`);
}

const total = all.json ? all.json.length : 0;
const page1 = await call('GET', '/api/products?page=1&limit=25', { token: staff });
check('API-12', 'pages of 25 with the total in X-Total-Count (req 2.6.4)',
  page1.status === 200 && page1.json.length === Math.min(25, total) && Number(page1.headers.get('x-total-count')) === total,
  `${page1.json?.length} on page 1, X-Total-Count ${page1.headers.get('x-total-count')}`);
const p1 = await call('GET', '/api/products?page=1&limit=3', { token: staff });
const p2 = await call('GET', '/api/products?page=2&limit=3', { token: staff });
const ids = (r) => (r.json || []).map((p) => p.productId);
check('API-12', 'page 2 continues where page 1 ends (no repeats)',
  p2.status === 200 && (total <= 3 || (ids(p2).length > 0 && !ids(p2).some((id) => ids(p1).includes(id)))),
  `page 1: ${ids(p1).join(',')} · page 2: ${ids(p2).join(',')}`);
const badPage = await call('GET', '/api/products?page=0&limit=500', { token: staff });
check('API-12', 'an impossible page or limit is refused, not guessed', badPage.status === 400, `status ${badPage.status}`);

const orders = await call('GET', '/api/orders', { token: staff });
const firstOrder = (orders.json || [])[0];
if (firstOrder) {
  const date = String(firstOrder.orderDate).slice(0, 10);
  const byDate = await call('GET', `/api/orders?search=${date}`, { token: staff });
  check('API-11', 'search orders by date (req 2.6.2)',
    byDate.status === 200 && byDate.json.length > 0 && byDate.json.every((o) => String(o.orderDate).slice(0, 10) === date),
    `${date}: ${byDate.json?.length} orders`);
  const byNumber = await call('GET', `/api/orders?search=${firstOrder.orderId}`, { token: staff });
  check('API-11', 'search orders by order number (req 2.6.2)',
    byNumber.status === 200 && byNumber.json.length === 1 && byNumber.json[0].orderId === firstOrder.orderId,
    `#${firstOrder.orderId}`);
} else {
  check('API-11', 'search orders (req 2.6.2): no orders on the live site yet, skipped', true);
}
const badSearch = await call('GET', '/api/orders?search=yesterday', { token: staff });
check('API-11', 'an order search that is not a number or a date explains what to type',
  badSearch.status === 400 && /order number/i.test(badSearch.json?.error || ''), badSearch.json?.error);

// ---------- week 8: security ----------
// SEC-04: Staff on admin endpoints. The role is checked BEFORE anything happens, so nothing changes
// (and the body only asks for what user 1 already is)
const listUsers = await call('GET', '/api/users', { token: staff });
check('SEC-04', 'Staff cannot list the user accounts (req 3.1.4)', listUsers.status === 403, `status ${listUsers.status}`);
const changeRole = await call('PUT', '/api/users/1/role', { token: staff, body: { role: 'Admin' } });
check('SEC-04', 'Staff cannot change anyone\'s role (req 3.1.4)', changeRole.status === 403, `status ${changeRole.status}`);
const adminList = await call('GET', '/api/users', { token: tokens.Admin });
check('SEC-04', 'the Admin can list the user accounts', adminList.status === 200, `${adminList.json?.length} accounts`);

const noToken = await call('GET', '/api/products');
check('SEC-04', 'no login, no data', noToken.status === 401, `status ${noToken.status}`);
const forged = staff ? staff.slice(0, -4) + (staff.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') : 'x';
const tampered = await call('GET', '/api/products', { token: forged });
check('SEC-04', 'a changed (forged) token is refused', tampered.status === 401, `status ${tampered.status}`);

// SEC-01: injection in the url and the search is harmless
const injectedId = await call('GET', `/api/products/${encodeURIComponent('1 OR 1=1')}`, { token: staff });
check('SEC-01', 'SQL text in an id is just "not found" (req 3.1.1)', injectedId.status === 404, `status ${injectedId.status}`);
const injectedSearch = await call('GET', `/api/products?search=${encodeURIComponent("' OR '1'='1")}`, { token: staff });
check('SEC-01', 'SQL text in a search matches nothing (req 3.1.1)',
  injectedSearch.status === 200 && injectedSearch.json.length === 0, `found ${injectedSearch.json?.length}`);
const injectedLogin = await call('POST', '/api/auth/login', { body: { email: "admin@demo.com' -- ", password: "' OR '1'='1" } });
check('SEC-01', 'SQL text in the login logs nobody in (req 3.1.1)', injectedLogin.status === 401, `status ${injectedLogin.status}`);
const badSort = await call('GET', '/api/products?sort=password_hash', { token: staff });
check('SEC-01', 'only the allowed sort columns are accepted', badSort.status === 400, `status ${badSort.status}`);

// SEC-05: errors say nothing about the inside of the system (reqs 3.2.1, 3.2.4)
const brokenJson = await call('POST', '/api/auth/login', { raw: '{"email": broken' });
check('SEC-05', 'broken JSON gets a short generic message (req 3.2.1)',
  brokenJson.status === 400 && !leaksDetails(brokenJson.text), brokenJson.json?.error);
const unknown = await call('GET', '/api/does-not-exist', { token: staff });
check('SEC-05', 'an unknown API address gets a JSON 404', unknown.status === 404 && unknown.json?.error === 'Not found', `status ${unknown.status}`);
const errorTexts = [wrong, badPage, badSearch, listUsers, noToken, tampered, injectedId, badSort, brokenJson, unknown].map((r) => r.text);
check('SEC-05', 'no error shows a stack trace, SQL or file path (req 3.2.4)', errorTexts.every((t) => !leaksDetails(t)));

// security headers on the API answers (helmet)
const h = all.headers;
check('HEADERS', 'API answers carry the security headers',
  Boolean(h.get('content-security-policy') && h.get('strict-transport-security') && h.get('x-content-type-options')) && !h.get('x-powered-by'),
  'CSP, HSTS, nosniff, no X-Powered-By');

// ---------- the profile page's data (req 2.3.1), read only ----------
const profile = await call('GET', '/api/users/profile', { token: staff });
check('SEC-03', 'the profile never sends the password or its hash', profile.status === 200 && !/password|\$2[aby]\$/.test(profile.text));

// ---------- speed (req 3.4.1) ----------
check('PERF', 'every answer above came back in under 2 seconds', slowest < 2000, `slowest ${slowest} ms`);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${results.length - failed} of ${results.length} live checks passed`);
process.exit(failed ? 1 : 0);
