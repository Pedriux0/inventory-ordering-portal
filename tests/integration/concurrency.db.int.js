// req 3.4.1: many users at the same time without data loss, against the REAL database
// (these are the situations the OWASP ZAP scan triggered: parallel writes to the same rows)
require('dotenv').config({ quiet: true });
const pool = require('../../src/config/db');
const inventoryModel = require('../../src/models/inventoryModel');
const userModel = require('../../src/models/userModel');
const auditLogModel = require('../../src/models/auditLogModel');

let productId;
let supplierId;
let userId;

beforeAll(async () => {
  const [p] = await pool.execute(
    "INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES ('INT Concurrency', 1, 0, 0)"
  );
  const [s] = await pool.execute("INSERT INTO suppliers (supplier_name) VALUES ('INT Concurrency Supplier')");
  const [u] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('INT Concurrency', ?, ?, 'Staff')",
    [`int-conc-${Date.now()}@test.local`, 'x'.repeat(60)]
  );
  productId = p.insertId;
  supplierId = s.insertId;
  userId = u.insertId;
});

afterAll(async () => {
  await pool.execute('DELETE FROM inventory_receipts WHERE product_id = ?', [productId]);
  await pool.execute('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
  await pool.execute('DELETE FROM products WHERE product_id = ?', [productId]);
  await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId]);
  await pool.execute('DELETE FROM users WHERE user_id = ?', [userId]);
  await pool.end();
});

test('30 deliveries of the same product recorded at the same moment: all saved, stock exact', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, () =>
      inventoryModel.createReceipt({ productId, supplierId, quantity: 2, dateReceived: '2026-10-01', receivedBy: userId })
    )
  );
  expect(results.filter((r) => r.status === 'rejected').map((r) => r.reason.code)).toEqual([]);
  const [rows] = await pool.execute('SELECT current_stock FROM products WHERE product_id = ?', [productId]);
  expect(rows[0].current_stock).toBe(60); // 30 x 2, nothing lost, nothing counted twice
  const [receipts] = await pool.execute('SELECT COUNT(*) AS n FROM inventory_receipts WHERE product_id = ?', [productId]);
  expect(receipts[0].n).toBe(30);
});

test('the same account changed many times at once while its actions are logged: no errors', async () => {
  const work = [];
  for (let i = 0; i < 15; i += 1) {
    work.push(userModel.updateRole(userId, i % 2 ? 'Manager' : 'Staff'));
    work.push(userModel.updateStatus(userId, true));
    work.push(auditLogModel.logEvent({ userId, action: 'CONCURRENCY_TEST' }));
  }
  const results = await Promise.allSettled(work);
  expect(results.filter((r) => r.status === 'rejected').map((r) => r.reason.code)).toEqual([]);
});
