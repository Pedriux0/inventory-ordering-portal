const pool = require('../config/db');
const { StockError, calculateStockAfterReceipt } = require('../utils/stock');

// inventory = current stock levels (req 2.5.4) + inventory receipts (reqs 2.4.2, 2.5.2)

// req 2.5.4, API-10: current stock of every product
// lowest stock compared to its reorder level comes first, so problems are at the top
async function findStockLevels() {
  const [rows] = await pool.execute(
    `SELECT product_id, product_name, current_stock, reorder_level
     FROM products
     ORDER BY (current_stock - reorder_level), product_name`
  );
  return rows;
}

// req 2.5.2, API-09: records a receipt AND adds the quantity to the product stock
// both happen in one transaction: either both are saved or neither is
// "FOR UPDATE" locks the product row until we commit, so two people receiving
// the same product at the same moment cant overwrite each other (req 3.4.1)
async function createReceipt({ productId, supplierId, quantity, dateReceived, receivedBy }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [products] = await conn.execute(
      'SELECT current_stock FROM products WHERE product_id = ? FOR UPDATE',
      [productId]
    );
    if (products.length === 0) throw new StockError('Product not found', 404);

    const [suppliers] = await conn.execute('SELECT is_active FROM suppliers WHERE supplier_id = ?', [
      supplierId,
    ]);
    if (suppliers.length === 0) throw new StockError('Supplier not found', 404);
    if (!suppliers[0].is_active) throw new StockError('Supplier is deactivated', 409);

    const newStock = calculateStockAfterReceipt(products[0].current_stock, quantity);

    const [result] = await conn.execute(
      `INSERT INTO inventory_receipts (product_id, supplier_id, quantity_received, date_received, received_by)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, supplierId, quantity, dateReceived, receivedBy]
    );
    await conn.execute('UPDATE products SET current_stock = ? WHERE product_id = ?', [
      newStock,
      productId,
    ]);

    await conn.commit();
    return { receiptId: result.insertId, productId, quantity, newStock };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// latest receipts with readable names, for the inventory page
async function findRecentReceipts(limit = 25) {
  // LIMIT cant be a ? placeholder with execute(), so we force it to a safe whole number
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
  const [rows] = await pool.execute(
    `SELECT r.receipt_id, r.quantity_received, r.date_received,
            p.product_name, s.supplier_name, u.full_name AS received_by_name
     FROM inventory_receipts r
     JOIN products p ON p.product_id = r.product_id
     JOIN suppliers s ON s.supplier_id = r.supplier_id
     JOIN users u ON u.user_id = r.received_by
     ORDER BY r.receipt_id DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

module.exports = { findStockLevels, createReceipt, findRecentReceipts };
