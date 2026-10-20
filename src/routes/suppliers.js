const express = require('express');
const supplierController = require('../controllers/supplierController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// every route below needs a valid login first
router.use(authenticate);

// read only, any logged in role (Staff picks a supplier when recording a receipt)
router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);

// supplier management, Manager and Admin only (reqs 2.2.5, 2.5.6)
router.post('/', requireRole('Manager', 'Admin'), supplierController.createSupplier);
router.put('/:id', requireRole('Manager', 'Admin'), supplierController.updateSupplier);
router.put('/:id/status', requireRole('Manager', 'Admin'), supplierController.updateStatus);

module.exports = router;
