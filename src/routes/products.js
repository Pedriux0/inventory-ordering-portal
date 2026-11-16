const express = require('express');
const validateId = require('../middleware/validateId');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// :id must be a plain whole number, anything else is 404 (see middleware/validateId.js)
router.param('id', validateId);

// every logged in role can work with products (Staff per req 2.5.1, Manager and Admin too)
router.use(authenticate);

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);

module.exports = router;
