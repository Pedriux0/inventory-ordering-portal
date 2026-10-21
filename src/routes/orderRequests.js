const express = require('express');
const orderRequestController = require('../controllers/orderRequestController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// every route below needs a valid login first
router.use(authenticate);

// any role can see the requests, Staff send their sales orders here for approval
router.get('/', orderRequestController.listRequests);
router.post('/', orderRequestController.createRequest);

// only Managers and Admins approve or decline (client change to req 2.5.3)
router.put('/:id/decision', requireRole('Manager', 'Admin'), orderRequestController.decideRequest);

module.exports = router;
