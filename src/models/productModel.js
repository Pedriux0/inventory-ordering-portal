const pool = require('../config/db');
const { escapeLike, readId } = require('../utils/listQuery');

// all the sql for the products table lives in this file
// always ? placeholders, never glue input into the sql (req 3.1.1)

const PRODUCT_COLUMNS =
  'product_id, product_name, description, unit_price, current_stock, reorder_level, created_at';

// req 2.6.3: the only columns you can sort by. The sort name from the url is looked up here,
// so user input never becomes part of the sql text
const SORT_COLUMNS = { name: 'product_name', price: 'unit_price', stock: 'current_stock' };

// req 2.4.1 + week 7 (reqs 2.6.1, 2.6.3, 2.6.4): products, optionally searched, sorted and paged
// options: { search, sort: 'name'|'price'|'stock', order: 'asc'|'desc', limit, offset }
// returns { rows, total } where total = how many match the search (for the page controls)
async function findAll({ search = '', sort = 'name', order = 'asc', limit, offset = 0 } = {}) {
  const where = [];
  const values = [];
  if (search) {
    // req 2.6.1: by name (part of it) or by product id ("12" or "#12")
    const id = readId(search);
    where.push(id ? '(product_name LIKE ? OR product_id = ?)' : 'product_name LIKE ?');
    values.push(`%${escapeLike(search)}%`);
    if (id) values.push(id);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const column = SORT_COLUMNS[sort] || SORT_COLUMNS.name;
  const direction = order === 'desc' ? 'DESC' : 'ASC';

  // LIMIT/OFFSET are numbers already checked by parsePaging, so they are safe to write in
  const pageSql = limit ? `LIMIT ${Number(limit)} OFFSET ${Number(offset)}` : '';
  const [rows] = await pool.execute(
    `SELECT ${PRODUCT_COLUMNS} FROM products ${whereSql}
     ORDER BY ${column} ${direction}, product_id ${direction} ${pageSql}`,
    values
  );
  const [count] = await pool.execute(`SELECT COUNT(*) AS total FROM products ${whereSql}`, values);
  return { rows, total: Number(count[0].total) };
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
