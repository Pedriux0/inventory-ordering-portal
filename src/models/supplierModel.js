const pool = require('../config/db');

// all the sql for the suppliers table lives in this file
// same rule as userModel: always ? placeholders, never glue input into the sql (req 3.1.1)

const SUPPLIER_COLUMNS =
  'supplier_id, supplier_name, contact_email, contact_phone, is_active, created_at';

// req 2.2.5: view supplier details (list), sorted by name so its easy to scan
async function findAll() {
  const [rows] = await pool.execute(
    `SELECT ${SUPPLIER_COLUMNS} FROM suppliers ORDER BY supplier_name`
  );
  return rows;
}

// req 2.2.5: view one supplier
async function findById(supplierId) {
  const [rows] = await pool.execute(
    `SELECT ${SUPPLIER_COLUMNS} FROM suppliers WHERE supplier_id = ?`,
    [supplierId]
  );
  return rows[0];
}

// req 2.5.6, API-15: create a new supplier
async function createSupplier({ supplierName, contactEmail, contactPhone }) {
  const [result] = await pool.execute(
    'INSERT INTO suppliers (supplier_name, contact_email, contact_phone) VALUES (?, ?, ?)',
    [supplierName, contactEmail, contactPhone]
  );
  return findById(result.insertId);
}

// req 2.5.6: update supplier information
async function updateSupplier(supplierId, { supplierName, contactEmail, contactPhone }) {
  await pool.execute(
    'UPDATE suppliers SET supplier_name = ?, contact_email = ?, contact_phone = ? WHERE supplier_id = ?',
    [supplierName, contactEmail, contactPhone, supplierId]
  );
  return findById(supplierId);
}

// req 2.5.6: deactivate / reactivate a supplier
// we never delete the row, inventory_receipts points to it with a foreign key
async function updateStatus(supplierId, isActive) {
  await pool.execute('UPDATE suppliers SET is_active = ? WHERE supplier_id = ?', [
    isActive,
    supplierId,
  ]);
  return findById(supplierId);
}

module.exports = { findAll, findById, createSupplier, updateSupplier, updateStatus };
