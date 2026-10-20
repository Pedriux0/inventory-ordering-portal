const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// every logged in role can process and view orders (Staff per req 2.5.3)
router.use(authenticate);

router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrder);
router.post('/', orderController.createOrder);

module.exports = router;
