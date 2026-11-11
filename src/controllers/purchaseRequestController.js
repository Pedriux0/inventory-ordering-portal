const purchaseRequestModel = require('../models/purchaseRequestModel');
const productModel = require('../models/productModel');
const supplierModel = require('../models/supplierModel');
const auditLogModel = require('../models/auditLogModel');
const { validatePurchaseRequest, validateDecision } = require('../utils/validators');

// req 2.2.5 "inventory approval": Staff ask for products to be ordered from a supplier,
// a Manager (or Admin) approves or declines. Managers and Admins dont need approval.
const APPROVER_ROLES = ['Manager', 'Admin'];
const STATUSES = ['Pending', 'Approved', 'Declined'];

// shape we send back for a request
function toPublicRequest(row) {
  return {
    requestId: row.request_id,
    productId: row.product_id,
    productName: row.product_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    quantity: row.quantity,
    note: row.note,
    status: row.status,
    requestedBy: row.requested_by_name,
    requestedByRole: row.requested_by_role,
    decidedBy: row.decided_by_name,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
  };
}

// GET /api/purchase-requests?status=Pending - any logged in role
async function listRequests(req, res) {
  const { status } = req.query;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
  }
  const rows = await purchaseRequestModel.findAll(status);
  res.status(200).json(rows.map(toPublicRequest));
}

// POST /api/purchase-requests - any logged in role
async function createRequest(req, res) {
  const errors = validatePurchaseRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const { productId, supplierId, quantity, note } = req.body;
  if (!(await productModel.findById(productId))) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const supplier = await supplierModel.findById(supplierId);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }
  if (!supplier.is_active) {
    return res.status(409).json({ error: 'Supplier is deactivated' });
  }

  // who asked comes from the token. Managers and Admins are approved straight away
  const autoApprove = APPROVER_ROLES.includes(req.user.role);
  const request = await purchaseRequestModel.createRequest({
    productId,
    supplierId,
    quantity,
    note: note && note.trim() ? note.trim() : null,
    requestedBy: req.user.userId,
    autoApprove,
  });
  res.status(201).json(toPublicRequest(request));
}

// PUT /api/purchase-requests/:id/decision - Manager and Admin only (requireRole in the route)
// body: { decision: 'Approved' | 'Declined', note }
async function decideRequest(req, res) {
  const errors = validateDecision(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const existing = await purchaseRequestModel.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const { decision, note } = req.body;
  const changed = await purchaseRequestModel.decide(req.params.id, {
    status: decision,
    decidedBy: req.user.userId,
    note: note && note.trim() ? note.trim() : null,
  });
  // already approved/declined (maybe by another manager a second ago)
  if (!changed) {
    return res.status(409).json({ error: 'This request was already decided' });
  }

  // decisions are recorded in the audit log, like other important actions
  await auditLogModel.logEvent({
    userId: req.user.userId,
    action: decision === 'Approved' ? 'REQUEST_APPROVED' : 'REQUEST_DECLINED',
    details: `request ${req.params.id}: ${existing.quantity} x ${existing.product_name}`,
    ipAddress: req.ip,
  });

  const updated = await purchaseRequestModel.findById(req.params.id);
  res.status(200).json(toPublicRequest(updated));
}

module.exports = { listRequests, createRequest, decideRequest };
