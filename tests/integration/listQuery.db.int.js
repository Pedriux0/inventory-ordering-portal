// real database tests for search, sort and pagination (week 7, reqs 2.6.1 - 2.6.4)
// run with: npm run test:db. Every row created here is deleted again at the end
require('dotenv').config({ quiet: true });
const pool = require('../../src/config/db');
const productModel = require('../../src/models/productModel');
const orderModel = require('../../src/models/orderModel');

const TAG = `ZZQ${Date.now()}`; // a unique word, so only this test's rows match the searches
const ids = [];
let userId;
let orderId;

beforeAll(async () => {
  // 30 products: "<TAG> Widget 01" ... "<TAG> Widget 30", plus one named with a % sign
  for (let i = 1; i <= 30; i += 1) {
    const [r] = await pool.execute(
      'INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES (?, ?, ?, 0)',
      [`${TAG} Widget ${String(i).padStart(2, '0')}`, i, 100 - i]
    );
    ids.push(r.insertId);
  }
  const [pct] = await pool.execute(
    'INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES (?, 1, 1, 0)',
    [`${TAG} 50% off`]
  );
  ids.push(pct.insertId);

  const [u] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT List', ?, ?, 'Staff')",
    [`int-list-${TAG}@test.local`, 'x'.repeat(60)]
  );
  userId = u.insertId;
  const [o] = await pool.execute(
    "INSERT INTO orders (user_id, order_date, total_amount) VALUES (?, '2026-10-01', 5)",
    [userId]
  );
  orderId = o.insertId;
});

afterAll(async () => {
  await pool.execute('DELETE FROM orders WHERE order_id = ?', [orderId]);
  await pool.execute('DELETE FROM users WHERE user_id = ?', [userId]);
  for (const id of ids) await pool.execute('DELETE FROM products WHERE product_id = ?', [id]);
  await pool.end();
});

test('API-05 search by part of the name finds the matching products (2.6.1)', async () => {
  const { rows, total } = await productModel.findAll({ search: `${TAG} Widget` });
  expect(total).toBe(30);
  expect(rows.every((r) => r.product_name.startsWith(`${TAG} Widget`))).toBe(true);
});

test('search by product id finds that product (2.6.1)', async () => {
  const { rows } = await productModel.findAll({ search: `#${ids[4]}` });
  expect(rows.map((r) => r.product_id)).toContain(ids[4]);
});

test('% in a search is a normal character, not a wildcard', async () => {
  const { rows, total } = await productModel.findAll({ search: `${TAG} 50%` });
  expect(total).toBe(1);
  expect(rows[0].product_name).toBe(`${TAG} 50% off`);
});

test('sort by price, highest first (2.6.3)', async () => {
  const { rows } = await productModel.findAll({ search: `${TAG} Widget`, sort: 'price', order: 'desc' });
  expect(Number(rows[0].unit_price)).toBe(30);
  expect(Number(rows[29].unit_price)).toBe(1);
});

test('sort by stock, lowest first (2.6.3)', async () => {
  const { rows } = await productModel.findAll({ search: `${TAG} Widget`, sort: 'stock', order: 'asc' });
  expect(rows[0].current_stock).toBe(70);
});

test('API-12 page 2 with 25 per page returns the remaining 5 of 30 (2.6.4)', async () => {
  const { rows, total } = await productModel.findAll({ search: `${TAG} Widget`, limit: 25, offset: 25 });
  expect(total).toBe(30);
  expect(rows).toHaveLength(5);
  expect(rows[0].product_name).toBe(`${TAG} Widget 26`);
});

test('API-11 search orders by date and by order number (2.6.2)', async () => {
  const byDate = await orderModel.findAll({ orderDate: '2026-10-01' });
  expect(byDate.rows.map((r) => r.order_id)).toContain(orderId);
  const byId = await orderModel.findAll({ orderId });
  expect(byId.total).toBe(1);
  expect(byId.rows[0].order_date).toBe('2026-10-01');
});
