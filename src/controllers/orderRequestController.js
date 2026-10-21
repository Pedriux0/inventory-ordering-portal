const orderRequestModel = require('../models/orderRequestModel');
const productModel = require('../models/productModel');
const auditLogModel = require('../models/auditLogModel');
const { validateOrder, validateDecision } = require('../utils/validators');
const { StockError } = require('../utils/stock');

// client change to req 2.5.3 (2026-10-21): Staff cannot place sales orders directly.
// Their orders wait here until a Manager or Admin approves (the order is processed then)
// or declines (with a reason). Managers and Admins keep using POST /api/orders.
const STATUSES = ['Pending', 'Approved', 'Declined'];

function toPublicRequest(row) {
  const items = row.items.map((i) => ({
    productId: i.product_id,
    productName: i.product_name,
    quantity: i.quantity,
    unitPrice: Number(i.unit_price), // current price, the real one is copied on approval
    inStock: i.current_stock,
  }));
  const totalCents = items.reduce((sum, i) => sum + Math.round(i.unitPrice * 100) * i.quantity, 0);
  return {
    orderRequestId: row.order_request_id,
    status: row.status,
    items,
    estimatedTotal: totalCents / 100,
    requestedBy: row.requested_by_name,
    createdAt: row.created_at,
    decidedBy: row.decided_by_name,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    orderId: row.order_id, // the real order, once approved
  };
}

// GET /api/order-requests?status=Pending - any logged in role
async function listRequests(req, res) {
  const { status } = req.query;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
  }
  const rows = await orderRequestModel.findAll(status);
  res.status(200).json(rows.map(toPublicRequest));
}

// POST /api/order-requests - Staff send a sales order for approval
// body: { items: [{ productId, quantity }, ...] } (same as an order)
async function createRequest(req, res) {
  const errors = validateOrder(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const items = req.body.items.map(({ productId, quantity }) => ({ productId, quantity }));
  // check now, so nobody waits for an approval that could never work
  // (stock is checked again, for real, when the manager approves)
  for (const item of items) {
    const product = await productModel.findById(item.productId);
    if (!product) {
      return res.status(404).json({ error: `Product ${item.productId} not found` });
    }
    if (item.quantity > product.current_stock) {
      return res.status(409).json({
        error: `${product.product_name}: Not enough stock: ${product.current_stock} available, ${item.quantity} requested`,
      });
    }
  }

  const request = await orderRequestModel.createRequest(req.user.userId, items);
  res.status(201).json(toPublicRequest(request));
}

// PUT /api/order-requests/:id/decision - Manager and Admin only (requireRole in the route)
// body: { decision: 'Approved' | 'Declined', note } (declining needs a note)
async function decideRequest(req, res) {
  const errors = validateDecision(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const existing = await orderRequestModel.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const { decision, note } = req.body;
  const summary = existing.items.map((i) => `${i.quantity} x ${i.product_name}`).join(', ');

  if (decision === 'Approved') {
    try {
      const order = await orderRequestModel.approve(req.params.id, req.user.userId);
      await auditLogModel.logEvent({
        userId: req.user.userId,
        action: 'ORDER_APPROVED',
        details: `order request ${req.params.id} -> order ${order.orderId}: ${summary}`,
        ipAddress: req.ip,
      });
    } catch (err) {
      // not enough stock any more, or another manager decided first: clear 4xx, nothing saved
      if (err instanceof StockError) {
        return res.status(err.status).json({ error: err.message });
      }
      throw err;
    }
  } else {
    const changed = await orderRequestModel.decline(req.params.id, req.user.userId, note.trim());
    if (!changed) {
      return res.status(409).json({ error: 'This request was already decided' });
    }
    await auditLogModel.logEvent({
      userId: req.user.userId,
      action: 'ORDER_DECLINED',
      details: `order request ${req.params.id}: ${summary}`,
      ipAddress: req.ip,
    });
  }

  const updated = await orderRequestModel.findById(req.params.id);
  res.status(200).json(toPublicRequest(updated));
}

module.exports = { listRequests, createRequest, decideRequest };
