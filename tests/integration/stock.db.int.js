// real database tests, NOT mocked: these talk to the MariaDB in .env
// run with: npm run test:db   (normal "npm test" skips this file so it works without a database)
// every row created here is deleted again at the end
require('dotenv').config();
const pool = require('../../src/config/db');
const productModel = require('../../src/models/productModel');
const supplierModel = require('../../src/models/supplierModel');
const inventoryModel = require('../../src/models/inventoryModel');
const orderModel = require('../../src/models/orderModel');
const { StockError } = require('../../src/utils/stock');

let userId;
let product;
let supplier;
const createdOrderIds = [];

beforeAll(async () => {
  // a throwaway user to own the receipt and orders
  const [result] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Integration Test', ?, ?, 'Staff')",
    [`int-test-${Date.now()}@test.local`, 'x'.repeat(60)]
  );
  userId = result.insertId;
  supplier = await supplierModel.createSupplier({
    supplierName: 'INT TEST Supplier',
    contactEmail: null,
    contactPhone: null,
  });
});

afterAll(async () => {
  // delete children before parents because of the foreign keys
  for (const orderId of createdOrderIds) {
    await pool.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    await pool.execute('DELETE FROM orders WHERE order_id = ?', [orderId]);
  }
  if (product) {
    await pool.execute('DELETE FROM inventory_receipts WHERE product_id = ?', [product.product_id]);
    await pool.execute('DELETE FROM products WHERE product_id = ?', [product.product_id]);
  }
  await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [supplier.supplier_id]);
  await pool.execute('DELETE FROM users WHERE user_id = ?', [userId]);
  await pool.end();
});

// UT-09 (req 3.4.2)
test('UT-09 a product inserted through the model can be read back from MySQL', async () => {
  product = await productModel.createProduct({
    productName: 'INT TEST Widget',
    description: null,
    unitPrice: 19.99,
    currentStock: 50,
    reorderLevel: 5,
  });

  const fromDb = await productModel.findById(product.product_id);
  expect(fromDb.product_name).toBe('INT TEST Widget');
  expect(Number(fromDb.unit_price)).toBe(19.99);
  expect(fromDb.current_stock).toBe(50);
});

// UT-03 / API-09 against the real database
test('a receipt of 25 takes the stock from 50 to 75 and is saved', async () => {
  const receipt = await inventoryModel.createReceipt({
    productId: product.product_id,
    supplierId: supplier.supplier_id,
    quantity: 25,
    dateReceived: '2026-10-01',
    receivedBy: userId,
  });

  expect(receipt.newStock).toBe(75);
  expect((await productModel.findById(product.product_id)).current_stock).toBe(75);
});

// UT-04 / API-04 against the real database
test('an order of 10 takes the stock from 75 to 65 and saves the order lines', async () => {
  const order = await orderModel.createOrder(userId, [{ productId: product.product_id, quantity: 10 }]);
  createdOrderIds.push(order.orderId);

  expect(order.totalAmount).toBe(199.9);
  expect((await productModel.findById(product.product_id)).current_stock).toBe(65);

  const saved = await orderModel.findById(order.orderId);
  expect(saved.items).toHaveLength(1);
  expect(saved.items[0].quantity_sold).toBe(10);
});

test('an order for more than the stock is refused and NOTHING is saved (rollback)', async () => {
  const [before] = await pool.execute('SELECT COUNT(*) AS total FROM orders');

  await expect(
    orderModel.createOrder(userId, [{ productId: product.product_id, quantity: 1000 }])
  ).rejects.toThrow(StockError);

  const [after] = await pool.execute('SELECT COUNT(*) AS total FROM orders');
  expect(after[0].total).toBe(before[0].total);
  expect((await productModel.findById(product.product_id)).current_stock).toBe(65);
});

// req 3.4.1: two people ordering the last units at the same moment
test('two orders at the same time cant oversell the stock', async () => {
  // 65 in stock, two orders of 40 at once: only one can succeed
  const results = await Promise.allSettled([
    orderModel.createOrder(userId, [{ productId: product.product_id, quantity: 40 }]),
    orderModel.createOrder(userId, [{ productId: product.product_id, quantity: 40 }]),
  ]);
  results
    .filter((r) => r.status === 'fulfilled')
    .forEach((r) => createdOrderIds.push(r.value.orderId));

  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect((await productModel.findById(product.product_id)).current_stock).toBe(25);
});

test('a receipt from a deactivated supplier is refused', async () => {
  await supplierModel.updateStatus(supplier.supplier_id, false);

  await expect(
    inventoryModel.createReceipt({
      productId: product.product_id,
      supplierId: supplier.supplier_id,
      quantity: 5,
      dateReceived: '2026-10-01',
      receivedBy: userId,
    })
  ).rejects.toThrow('Supplier is deactivated');
});
