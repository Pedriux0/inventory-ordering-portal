const pool = require('../config/db');

// all the sql for the products table lives in this file
// always ? placeholders, never glue input into the sql (req 3.1.1)

const PRODUCT_COLUMNS =
  'product_id, product_name, description, unit_price, current_stock, reorder_level, created_at';

// req 2.4.1: list every product, sorted by name
// (search, sort options and pagination are week 7, reqs 2.6.1 - 2.6.4)
async function findAll() {
  const [rows] = await pool.execute(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY product_name`);
  return rows;
}

async function findById(productId) {
  const [rows] = await pool.execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE product_id = ?`, [
    productId,
  ]);
  return rows[0];
}

// req 2.5.1, API-03: create a product with its starting stock
async function createProduct({ productName, description, unitPrice, currentStock, reorderLevel }) {
  const [result] = await pool.execute(
    `INSERT INTO products (product_name, description, unit_price, current_stock, reorder_level)
     VALUES (?, ?, ?, ?, ?)`,
    [productName, description, unitPrice, currentStock, reorderLevel]
  );
  return findById(result.insertId);
}

// req 2.5.1: update product details
// current_stock is left out on purpose, it only changes through receipts and orders
async function updateProduct(productId, { productName, description, unitPrice, reorderLevel }) {
  await pool.execute(
    `UPDATE products SET product_name = ?, description = ?, unit_price = ?, reorder_level = ?
     WHERE product_id = ?`,
    [productName, description, unitPrice, reorderLevel, productId]
  );
  return findById(productId);
}

module.exports = { findAll, findById, createProduct, updateProduct };
