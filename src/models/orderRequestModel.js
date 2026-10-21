const pool = require('../config/db');
const { StockError } = require('../utils/stock');
const { insertOrder } = require('./orderModel');

// sales orders from Staff that wait for a Manager's approval (client change to req 2.5.3)
// always ? placeholders, never glue input into the sql (req 3.1.1)

const SELECT_REQUESTS = `
  SELECT r.order_request_id, r.status, r.decision_note, r.decided_at, r.created_at, r.order_id,
         r.requested_by, requester.full_name AS requested_by_name,
         r.decided_by, decider.full_name AS decided_by_name
  FROM order_requests r
  JOIN users requester ON requester.user_id = r.requested_by
  LEFT JOIN users decider ON decider.user_id = r.decided_by`;

// adds the product lines to each request (one extra query for all of them)
// the price shown is the CURRENT price: the real price is copied when the order is approved
async function attachItems(requests) {
  if (requests.length === 0) return requests;
  const ids = requests.map((r) => r.order_request_id);
  const placeholders = ids.map(() => '?').join(', '); // one ? per id, values passed separately
  const [items] = await pool.execute(
    `SELECT i.order_request_id, i.product_id, p.product_name, i.quantity, p.unit_price, p.current_stock
     FROM order_request_items i JOIN products p ON p.product_id = i.product_id
     WHERE i.order_request_id IN (${placeholders})
     ORDER BY i.order_request_item_id`,
    ids
  );
  return requests.map((r) => ({ ...r, items: items.filter((i) => i.order_request_id === r.order_request_id) }));
}

async function findAll(status) {
  const [rows] = status
    ? await pool.execute(`${SELECT_REQUESTS} WHERE r.status = ? ORDER BY r.order_request_id DESC`, [status])
    : await pool.execute(`${SELECT_REQUESTS} ORDER BY r.order_request_id DESC`);
  return attachItems(rows);
}

async function findById(requestId) {
  const [rows] = await pool.execute(`${SELECT_REQUESTS} WHERE r.order_request_id = ?`, [requestId]);
  if (rows.length === 0) return undefined;
  return (await attachItems(rows))[0];
}

// Staff send an order for approval: the request and its lines are saved together
async function createRequest(userId, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute('INSERT INTO order_requests (requested_by) VALUES (?)', [userId]);
    for (const item of items) {
      await conn.execute(
        'INSERT INTO order_request_items (order_request_id, product_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, item.productId, item.quantity]
      );
    }
    await conn.commit();
    return findById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// a Manager approves: in ONE transaction the request is locked, the real order is created
// (same code and stock rules as any order, the order belongs to the Staff member who asked)
// and the request is marked Approved. If stock ran out meanwhile, everything rolls back
// and the request stays Pending, so the manager can decline it instead.
async function approve(requestId, decidedBy) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // FOR UPDATE: if two managers approve at the same moment, the second one waits here
    // and then sees the request is no longer Pending
    const [rows] = await conn.execute(
      'SELECT status, requested_by FROM order_requests WHERE order_request_id = ? FOR UPDATE',
      [requestId]
    );
    if (rows.length === 0) throw new StockError('Request not found', 404);
    if (rows[0].status !== 'Pending') throw new StockError('This request was already decided', 409);

    const [items] = await conn.execute(
      'SELECT product_id, quantity FROM order_request_items WHERE order_request_id = ?',
      [requestId]
    );
    const order = await insertOrder(
      conn,
      rows[0].requested_by,
      items.map((i) => ({ productId: i.product_id, quantity: i.quantity }))
    );

    await conn.execute(
      `UPDATE order_requests SET status = 'Approved', decided_by = ?, decided_at = NOW(), order_id = ?
       WHERE order_request_id = ?`,
      [decidedBy, order.orderId, requestId]
    );

    await conn.commit();
    return order;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// a Manager declines (with a reason). Only works while still Pending.
// returns true if this call made the decision
async function decline(requestId, decidedBy, note) {
  const [result] = await pool.execute(
    `UPDATE order_requests SET status = 'Declined', decided_by = ?, decided_at = NOW(), decision_note = ?
     WHERE order_request_id = ? AND status = 'Pending'`,
    [decidedBy, note, requestId]
  );
  return result.affectedRows === 1;
}

module.exports = { findAll, findById, createRequest, approve, decline };
