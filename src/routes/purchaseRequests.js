const express = require('express');
const purchaseRequestController = require('../controllers/purchaseRequestController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// every route below needs a valid login first
router.use(authenticate);

// any role can see and create requests (Staff ask, Managers and Admins are approved straight away)
router.get('/', purchaseRequestController.listRequests);
router.post('/', purchaseRequestController.createRequest);

// only Managers and Admins approve or decline (req 2.2.5)
router.put('/:id/decision', requireRole('Manager', 'Admin'), purchaseRequestController.decideRequest);

module.exports = router;
