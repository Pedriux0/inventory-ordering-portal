const express = require('express');
const validateId = require('../middleware/validateId');
const purchaseRequestController = require('../controllers/purchaseRequestController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// :id must be a plain whole number, anything else is 404 (see middleware/validateId.js)
router.param('id', validateId);

// every route below needs a valid login first
router.use(authenticate);

// any role can see and create requests (Staff ask, Managers and Admins are approved straight away)
router.get('/', purchaseRequestController.listRequests);
router.post('/', purchaseRequestController.createRequest);

// only Managers and Admins approve or decline (req 2.2.5)
router.put('/:id/decision', requireRole('Manager', 'Admin'), purchaseRequestController.decideRequest);

module.exports = router;
