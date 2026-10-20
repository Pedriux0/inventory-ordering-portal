const pool = require('../config/db');
const { StockError, calculateStockAfterOrder } = require('../utils/stock');

// all the sql for orders + order_items lives in this file (reqs 2.4.3, 2.5.3)

// req 2.5.3, API-04: processes a sales order
// one transaction for everything: the order, its lines and every stock deduction
// if ANY product is short on stock, nothing is saved at all (rollback)
// "FOR UPDATE" locks each product row so two orders cant sell the same last unit (req 3.4.1)
async function createOrder(userId, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock the products in id order, so two orders with the same products
    // always lock in the same order and cant deadlock each other
    const sortedItems = [...items].sort((a, b) => a.productId - b.productId);

    const lines = [];
    for (const item of sortedItems) {
      const [products] = await conn.execute(
        'SELECT product_name, unit_price, current_stock FROM products WHERE product_id = ? FOR UPDATE',
        [item.productId]
      );
      if (products.length === 0) throw new StockError(`Product ${item.productId} not found`, 404);

      const product = products[0];
      let newStock;
      try {
        newStock = calculateStockAfterOrder(product.current_stock, item.quantity);
      } catch (err) {
        // add the product name so the user knows which line failed
        throw new StockError(`${product.product_name}: ${err.message}`, err.status);
      }

      lines.push({
        productId: item.productId,
        productName: product.product_name,
        quantity: item.quantity,
        unitPrice: Number(product.unit_price), // price is copied at sale time (unit_price_at_sale)
        newStock,
      });
    }

    // total in cents to avoid floating point errors, then back to dollars
    const totalCents = lines.reduce((sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity, 0);
    const totalAmount = totalCents / 100;

    const [orderResult] = await conn.execute(
      'INSERT INTO orders (user_id, order_date, total_amount) VALUES (?, CURDATE(), ?)',
      [userId, totalAmount]
    );
    const orderId = orderResult.insertId;

    for (const line of lines) {
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, quantity_sold, unit_price_at_sale)
         VALUES (?, ?, ?, ?)`,
        [orderId, line.productId, line.quantity, line.unitPrice]
      );
      await conn.execute('UPDATE products SET current_stock = ? WHERE product_id = ?', [
        line.newStock,
        line.productId,
      ]);
    }

    await conn.commit();
    return { orderId, totalAmount, items: lines };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// order history, newest first, with who made it and how many units
// (search by id/date and pagination are week 7, reqs 2.6.2 and 2.6.4)
async function findAll() {
  const [rows] = await pool.execute(
    `SELECT o.order_id, o.order_date, o.total_amount, u.full_name AS created_by_name,
            COUNT(oi.order_item_id) AS line_count, COALESCE(SUM(oi.quantity_sold), 0) AS unit_count
     FROM orders o
     JOIN users u ON u.user_id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.order_id
     GROUP BY o.order_id, o.order_date, o.total_amount, u.full_name
     ORDER BY o.order_id DESC`
  );
  return rows;
}

// one order with all its lines
async function findById(orderId) {
  const [orders] = await pool.execute(
    `SELECT o.order_id, o.order_date, o.total_amount, u.full_name AS created_by_name
     FROM orders o JOIN users u ON u.user_id = o.user_id
     WHERE o.order_id = ?`,
    [orderId]
  );
  if (orders.length === 0) return undefined;

  const [items] = await pool.execute(
    `SELECT oi.product_id, p.product_name, oi.quantity_sold, oi.unit_price_at_sale
     FROM order_items oi JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.order_item_id`,
    [orderId]
  );
  return { ...orders[0], items };
}

module.exports = { createOrder, findAll, findById };
