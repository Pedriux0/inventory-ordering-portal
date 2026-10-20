const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// every logged in role can view stock and record receipts (Staff per reqs 2.5.2 and 2.5.4)
router.use(authenticate);

router.get('/', inventoryController.getInventory);
router.get('/receipts', inventoryController.listReceipts);
router.post('/receipts', inventoryController.createReceipt);

module.exports = router;
