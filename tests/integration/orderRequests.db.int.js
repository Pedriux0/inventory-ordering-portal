// real database tests for order requests (client change to req 2.5.3), NOT mocked
// run with: npm run test:db. Every row created here is deleted again at the end
require('dotenv').config();
const pool = require('../../src/config/db');
const orderRequestModel = require('../../src/models/orderRequestModel');
const { StockError } = require('../../src/utils/stock');

let staffId;
let managerId;
let productId;
const stockOf = async () => (await pool.execute('SELECT current_stock FROM products WHERE product_id = ?', [productId]))[0][0].current_stock;

beforeAll(async () => {
  const stamp = Date.now();
  const [staff] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT Order Staff', ?, ?, 'Staff')",
    [`int-ostaff-${stamp}@test.local`, 'x'.repeat(60)]
  );
  const [manager] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT Order Manager', ?, ?, 'Manager')",
    [`int-omanager-${stamp}@test.local`, 'x'.repeat(60)]
  );
  const [product] = await pool.execute(
    "INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES ('INT Order Widget', 2.50, 10, 2)"
  );
  staffId = staff.insertId;
  managerId = manager.insertId;
  productId = product.insertId;
});

afterAll(async () => {
  const [reqs] = await pool.execute('SELECT order_request_id, order_id FROM order_requests WHERE requested_by = ?', [staffId]);
  for (const r of reqs) {
    await pool.execute('DELETE FROM order_request_items WHERE order_request_id = ?', [r.order_request_id]);
    await pool.execute('DELETE FROM order_requests WHERE order_request_id = ?', [r.order_request_id]);
    if (r.order_id) {
      await pool.execute('DELETE FROM order_items WHERE order_id = ?', [r.order_id]);
      await pool.execute('DELETE FROM orders WHERE order_id = ?', [r.order_id]);
    }
  }
  await pool.execute('DELETE FROM products WHERE product_id = ?', [productId]);
  await pool.execute('DELETE FROM users WHERE user_id IN (?, ?)', [staffId, managerId]);
  await pool.end();
});

test('a Staff order request does NOT change the stock while it waits', async () => {
  const created = await orderRequestModel.createRequest(staffId, [{ productId, quantity: 4 }]);
  expect(created.status).toBe('Pending');
  expect(created.items[0].quantity).toBe(4);
  expect(await stockOf()).toBe(10);
});

test('approving creates the real order for the Staff member and takes the stock (10 -> 6)', async () => {
  const pending = await orderRequestModel.createRequest(staffId, [{ productId, quantity: 4 }]);
  const order = await orderRequestModel.approve(pending.order_request_id, managerId);

  expect(order.totalAmount).toBe(10);
  expect(await stockOf()).toBe(6);
  const saved = await orderRequestModel.findById(pending.order_request_id);
  expect(saved.status).toBe('Approved');
  expect(saved.order_id).toBe(order.orderId);
  expect(saved.decided_by_name).toBe('INT Order Manager');
  const [orders] = await pool.execute('SELECT user_id FROM orders WHERE order_id = ?', [order.orderId]);
  expect(orders[0].user_id).toBe(staffId); // the sale belongs to the person who made it
});

test('if the stock ran out before approval, nothing changes and it stays Pending', async () => {
  const pending = await orderRequestModel.createRequest(staffId, [{ productId, quantity: 6 }]);
  await pool.execute('UPDATE products SET current_stock = 5 WHERE product_id = ?', [productId]); // someone sold one
  const [ordersBefore] = await pool.execute('SELECT COUNT(*) AS n FROM orders');

  await expect(orderRequestModel.approve(pending.order_request_id, managerId)).rejects.toThrow(StockError);

  const [ordersAfter] = await pool.execute('SELECT COUNT(*) AS n FROM orders');
  expect(ordersAfter[0].n).toBe(ordersBefore[0].n);
  expect(await stockOf()).toBe(5);
  expect((await orderRequestModel.findById(pending.order_request_id)).status).toBe('Pending');
});

test('two managers approving at the same moment create only ONE order', async () => {
  await pool.execute('UPDATE products SET current_stock = 10 WHERE product_id = ?', [productId]);
  const pending = await orderRequestModel.createRequest(staffId, [{ productId, quantity: 3 }]);
  const results = await Promise.allSettled([
    orderRequestModel.approve(pending.order_request_id, managerId),
    orderRequestModel.approve(pending.order_request_id, managerId),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await stockOf()).toBe(7); // taken once, not twice
});

test('declining keeps the stock and records the reason', async () => {
  const pending = await orderRequestModel.createRequest(staffId, [{ productId, quantity: 1 }]);
  expect(await orderRequestModel.decline(pending.order_request_id, managerId, 'Customer cancelled')).toBe(true);
  expect(await orderRequestModel.decline(pending.order_request_id, managerId, 'again')).toBe(false); // already decided
  const saved = await orderRequestModel.findById(pending.order_request_id);
  expect(saved.status).toBe('Declined');
  expect(saved.decision_note).toBe('Customer cancelled');
  expect(await stockOf()).toBe(7);
});
