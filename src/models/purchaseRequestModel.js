const pool = require('../config/db');

// all the sql for purchase_requests lives in this file (req 2.2.5, inventory approval)
// always ? placeholders, never glue input into the sql (req 3.1.1)

// every request with readable names instead of ids, newest first
const SELECT_REQUESTS = `
  SELECT r.request_id, r.product_id, p.product_name, r.supplier_id, s.supplier_name,
         r.quantity, r.note, r.status, r.decision_note, r.decided_at, r.created_at,
         r.requested_by, requester.full_name AS requested_by_name, requester.role AS requested_by_role,
         r.decided_by, decider.full_name AS decided_by_name
  FROM purchase_requests r
  JOIN products p ON p.product_id = r.product_id
  JOIN suppliers s ON s.supplier_id = r.supplier_id
  JOIN users requester ON requester.user_id = r.requested_by
  LEFT JOIN users decider ON decider.user_id = r.decided_by`;

// list, optionally only one status (e.g. only 'Pending' for the manager's to-do list)
async function findAll(status) {
  if (status) {
    const [rows] = await pool.execute(`${SELECT_REQUESTS} WHERE r.status = ? ORDER BY r.request_id DESC`, [status]);
    return rows;
  }
  const [rows] = await pool.execute(`${SELECT_REQUESTS} ORDER BY r.request_id DESC`);
  return rows;
}

async function findById(requestId) {
  const [rows] = await pool.execute(`${SELECT_REQUESTS} WHERE r.request_id = ?`, [requestId]);
  return rows[0];
}

// creates a request
// autoApprove = true when a Manager or Admin asks: their requests dont need approval,
// so it is saved as Approved with themselves as the decider
async function createRequest({ productId, supplierId, quantity, note, requestedBy, autoApprove }) {
  const [result] = await pool.execute(
    `INSERT INTO purchase_requests
       (product_id, supplier_id, quantity, note, requested_by, status, decided_by, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productId,
      supplierId,
      quantity,
      note,
      requestedBy,
      autoApprove ? 'Approved' : 'Pending',
      autoApprove ? requestedBy : null,
      autoApprove ? new Date() : null,
    ]
  );
  return findById(result.insertId);
}

// approve or decline, but ONLY if the request is still Pending
// the "AND status = 'Pending'" makes this safe when two managers click at the same time:
// the first one changes the row, the second one changes nothing (affectedRows = 0)
// returns true if this call made the decision
async function decide(requestId, { status, decidedBy, note }) {
  const [result] = await pool.execute(
    `UPDATE purchase_requests
     SET status = ?, decided_by = ?, decided_at = NOW(), decision_note = ?
     WHERE request_id = ? AND status = 'Pending'`,
    [status, decidedBy, note, requestId]
  );
  return result.affectedRows === 1;
}

module.exports = { findAll, findById, createRequest, decide };
