const express = require('express');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// every logged in role can work with products (Staff per req 2.5.1, Manager and Admin too)
router.use(authenticate);

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);

module.exports = router;
