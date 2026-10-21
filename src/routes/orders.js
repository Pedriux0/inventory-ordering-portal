const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// every logged in role can view orders
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrder);

// client change to req 2.5.3 (2026-10-21): only Managers and Admins place orders directly.
// Staff send theirs to /api/order-requests and a Manager approves them first.
// A Staff call here gets 403 and is logged (req 3.2.3), so the rule cant be skipped
router.post('/', requireRole('Manager', 'Admin'), orderController.createOrder);

module.exports = router;
