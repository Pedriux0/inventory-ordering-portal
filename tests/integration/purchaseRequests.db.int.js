// real database tests for purchase requests (req 2.2.5), NOT mocked
// run with: npm run test:db. Every row created here is deleted again at the end
require('dotenv').config();
const pool = require('../../src/config/db');
const purchaseRequestModel = require('../../src/models/purchaseRequestModel');

let staffId;
let managerId;
let productId;
let supplierId;

beforeAll(async () => {
  const stamp = Date.now();
  const [staff] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT Staff', ?, ?, 'Staff')",
    [`int-staff-${stamp}@test.local`, 'x'.repeat(60)]
  );
  const [manager] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT Manager', ?, ?, 'Manager')",
    [`int-manager-${stamp}@test.local`, 'x'.repeat(60)]
  );
  const [product] = await pool.execute(
    "INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES ('INT Request Widget', 5, 10, 5)"
  );
  const [supplier] = await pool.execute("INSERT INTO suppliers (supplier_name) VALUES ('INT Request Supplier')");
  staffId = staff.insertId;
  managerId = manager.insertId;
  productId = product.insertId;
  supplierId = supplier.insertId;
});

afterAll(async () => {
  await pool.execute('DELETE FROM purchase_requests WHERE product_id = ?', [productId]);
  await pool.execute('DELETE FROM products WHERE product_id = ?', [productId]);
  await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId]);
  await pool.execute('DELETE FROM users WHERE user_id IN (?, ?)', [staffId, managerId]);
  await pool.end();
});

test('a Staff request is saved as Pending with readable names', async () => {
  const created = await purchaseRequestModel.createRequest({
    productId, supplierId, quantity: 40, note: 'weekend rush', requestedBy: staffId, autoApprove: false,
  });
  expect(created.status).toBe('Pending');
  expect(created.product_name).toBe('INT Request Widget');
  expect(created.requested_by_name).toBe('INT Staff');
  expect(created.decided_by).toBeNull();
});

test('a Manager request is saved as Approved by the manager themselves', async () => {
  const created = await purchaseRequestModel.createRequest({
    productId, supplierId, quantity: 20, note: null, requestedBy: managerId, autoApprove: true,
  });
  expect(created.status).toBe('Approved');
  expect(created.decided_by).toBe(managerId);
  expect(created.decided_at).not.toBeNull();
});

test('two managers deciding the same request at once: only the first one counts', async () => {
  const pending = await purchaseRequestModel.createRequest({
    productId, supplierId, quantity: 5, note: null, requestedBy: staffId, autoApprove: false,
  });
  const [first, second] = await Promise.all([
    purchaseRequestModel.decide(pending.request_id, { status: 'Approved', decidedBy: managerId, note: null }),
    purchaseRequestModel.decide(pending.request_id, { status: 'Declined', decidedBy: managerId, note: 'no' }),
  ]);
  expect([first, second].filter(Boolean)).toHaveLength(1);

  const saved = await purchaseRequestModel.findById(pending.request_id);
  expect(['Approved', 'Declined']).toContain(saved.status);
  expect(saved.decided_by_name).toBe('INT Manager');
});

test('the Pending filter only returns pending requests', async () => {
  const pendingOnly = await purchaseRequestModel.findAll('Pending');
  expect(pendingOnly.every((r) => r.status === 'Pending')).toBe(true);
});

test('approving does not change the stock (only receipts do)', async () => {
  const [rows] = await pool.execute('SELECT current_stock FROM products WHERE product_id = ?', [productId]);
  expect(rows[0].current_stock).toBe(10);
});
