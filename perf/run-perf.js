// PERF-01 and PERF-02 (proposal section 4.6, tool: Artillery, req 3.4.1)
// prepares its own product + supplier, runs the Artillery scenarios, then checks in the api
// that no data was lost. Reports: perf/reports/perf-01.json and perf-02.json
//
// usage: node perf/run-perf.js [api url]   (default http://localhost:3000, api running + npm run seed)
// never point this at the live site: it creates products, deliveries and orders
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET = process.argv[2] || process.env.TARGET || 'http://localhost:3000';
const REPORTS = path.join(__dirname, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });

async function api(method, url, token, body) {
  const res = await fetch(TARGET + url, {
    method,
    // "Connection: close": a fresh connection each time. The runner waits a minute while artillery
    // runs, and a reused idle connection would already be closed by the server by then
    headers: {
      'Content-Type': 'application/json',
      Connection: 'close',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const stockOf = async (token, productId) => (await api('GET', `/api/products/${productId}`, token)).currentStock;

// runs one artillery scenario, returns its counters and response times
function artillery(file, reportName, env) {
  const output = path.join(REPORTS, `${reportName}.json`);
  let passedEnsure = true;
  try {
    execFileSync('npx', ['-y', 'artillery@2', 'run', path.join(__dirname, file), '--output', output], {
      env: { ...process.env, TARGET, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    passedEnsure = false; // artillery exits with an error when an "ensure" threshold fails
  }
  const aggregate = JSON.parse(fs.readFileSync(output, 'utf8')).aggregate;
  const c = aggregate.counters;
  const statusCounts = Object.fromEntries(
    Object.entries(c).filter(([k]) => k.startsWith('http.codes.')).map(([k, v]) => [k.slice(11), v])
  );
  return {
    passedEnsure,
    statusCounts,
    requests: c['http.requests'] || 0,
    errors: Object.entries(c).filter(([k]) => k.startsWith('errors.')).reduce((n, [, v]) => n + v, 0),
    failedExpectations: c['plugins.expect.failed'] || 0,
    p95: aggregate.summaries?.['http.response_time']?.p95,
    p99: aggregate.summaries?.['http.response_time']?.p99,
    max: aggregate.summaries?.['http.response_time']?.max,
  };
}

const results = [];
function check(id, description, ok, detail) {
  results.push({ id, description, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${description}  (${detail})`);
}

(async () => {
  console.log(`performance tests against ${TARGET}\n`);
  const manager = (await api('POST', '/api/auth/login', null, { email: 'manager@demo.com', password: 'DemoManagerPass2026' })).token;
  const tag = Date.now().toString(36);
  const supplier = await api('POST', '/api/suppliers', manager, { supplierName: `PERF Supplier ${tag}` });

  // ---------- PERF-01: 20 users, 60 seconds ----------
  const loadProduct = await api('POST', '/api/products', manager, {
    productName: `PERF Load ${tag}`, unitPrice: 1, currentStock: 0, reorderLevel: 0,
  });
  console.log('PERF-01: 20 users for 60 seconds (please wait about a minute) ...');
  const load = artillery('perf-01-load.yml', 'perf-01', {
    PERF_EMAIL: 'staff@demo.com',
    PERF_PASSWORD: 'DemoStaffPass2026',
    PERF_PRODUCT_ID: String(loadProduct.productId),
    PERF_SUPPLIER_ID: String(supplier.supplierId),
  });
  const onlyOk = Object.keys(load.statusCounts).every((code) => code === '200' || code === '201');
  const receipts = load.statusCounts['201'] || 0;
  const loadStock = await stockOf(manager, loadProduct.productId);
  check('PERF-01', 'all responses 200 OK / 201 Created', onlyOk && load.errors === 0 && load.failedExpectations === 0,
    `${load.requests} requests, codes ${JSON.stringify(load.statusCounts)}, errors ${load.errors}`);
  check('PERF-01', 'responses under 2 seconds', load.p99 < 2000,
    `p95 ${load.p95} ms, p99 ${load.p99} ms, slowest ${load.max} ms`);
  check('PERF-01', 'no data loss', loadStock === receipts,
    `${receipts} deliveries of 1 recorded at the same time, stock is ${loadStock}`);

  // ---------- PERF-02: 10 simultaneous orders ----------
  const initial = 100;
  const orderProduct = await api('POST', '/api/products', manager, {
    productName: `PERF Orders ${tag}`, unitPrice: 2, currentStock: initial, reorderLevel: 0,
  });
  console.log('\nPERF-02: 10 simultaneous orders of 3 units ...');
  const orders = artillery('perf-02-orders.yml', 'perf-02', {
    PERF_TOKEN: manager,
    PERF_PRODUCT_ID: String(orderProduct.productId),
    PERF_SUPPLIER_ID: String(supplier.supplierId),
  });
  const placed = orders.statusCounts['201'] || 0;
  const finalStock = await stockOf(manager, orderProduct.productId);
  check('PERF-02', 'all 10 orders accepted', placed === 10 && orders.errors === 0, `codes ${JSON.stringify(orders.statusCounts)}`);
  check('PERF-02', 'stock = initial - total quantity', finalStock === initial - placed * 3,
    `${initial} - ${placed} x 3 = ${initial - placed * 3}, stock is ${finalStock}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length} of ${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
