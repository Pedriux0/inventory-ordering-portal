const supplierModel = require('../models/supplierModel');
const { validateSupplier } = require('../utils/validators');

// shape we send back for a supplier, built from named fields only
function toPublicSupplier(supplier) {
  return {
    supplierId: supplier.supplier_id,
    supplierName: supplier.supplier_name,
    contactEmail: supplier.contact_email,
    contactPhone: supplier.contact_phone,
    isActive: !!supplier.is_active,
    createdAt: supplier.created_at,
  };
}

// trims the input and turns empty optional fields into null, so the db stores NULL not ''
function cleanSupplierInput({ supplierName, contactEmail, contactPhone }) {
  return {
    supplierName: supplierName.trim(),
    contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
    contactPhone: contactPhone ? contactPhone.trim() : null,
  };
}

// ---- read: any logged in role (Staff needs the list to record receipts, req 2.5.2) ----

// GET /api/suppliers  (req 2.2.5)
async function listSuppliers(req, res) {
  const suppliers = await supplierModel.findAll();
  res.status(200).json(suppliers.map(toPublicSupplier));
}

// GET /api/suppliers/:id  (req 2.2.5)
async function getSupplier(req, res) {
  const supplier = await supplierModel.findById(req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }
  res.status(200).json(toPublicSupplier(supplier));
}

// ---- write: Manager and Admin only (reqs 2.2.5, 2.5.6) ----

// POST /api/suppliers  (req 2.5.6, API-15)
async function createSupplier(req, res) {
  const errors = validateSupplier(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const supplier = await supplierModel.createSupplier(cleanSupplierInput(req.body));
  res.status(201).json(toPublicSupplier(supplier));
}

// PUT /api/suppliers/:id  (req 2.5.6) - update supplier information
async function updateSupplier(req, res) {
  const errors = validateSupplier(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const supplier = await supplierModel.findById(req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  const updated = await supplierModel.updateSupplier(req.params.id, cleanSupplierInput(req.body));
  res.status(200).json(toPublicSupplier(updated));
}

// PUT /api/suppliers/:id/status  (req 2.5.6) - deactivate / reactivate
async function updateStatus(req, res) {
  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be true or false' });
  }

  const supplier = await supplierModel.findById(req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  const updated = await supplierModel.updateStatus(req.params.id, active);
  res.status(200).json(toPublicSupplier(updated));
}

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier, updateStatus };
