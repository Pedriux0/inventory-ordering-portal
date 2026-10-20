const productModel = require('../models/productModel');
const { validateProduct } = require('../utils/validators');
const { isLowStock } = require('../utils/stock');

// shape we send back for a product (req 2.4.1)
function toPublicProduct(product) {
  return {
    productId: product.product_id,
    productName: product.product_name,
    description: product.description,
    unitPrice: Number(product.unit_price), // mysql2 returns DECIMAL as text, the client wants a number
    currentStock: product.current_stock,
    reorderLevel: product.reorder_level,
    lowStock: isLowStock(product.current_stock, product.reorder_level),
    createdAt: product.created_at,
  };
}

// trims text and turns an empty description into null
function cleanProductInput({ productName, description, unitPrice, currentStock, reorderLevel }) {
  return {
    productName: productName.trim(),
    description: description && description.trim() ? description.trim() : null,
    unitPrice,
    currentStock,
    reorderLevel: reorderLevel === undefined ? 0 : reorderLevel,
  };
}

// GET /api/products  (req 2.4.1)
async function listProducts(req, res) {
  const products = await productModel.findAll();
  res.status(200).json(products.map(toPublicProduct));
}

// GET /api/products/:id
async function getProduct(req, res) {
  const product = await productModel.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.status(200).json(toPublicProduct(product));
}

// POST /api/products  (req 2.5.1, API-03)
async function createProduct(req, res) {
  const errors = validateProduct(req.body, { isNew: true });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const product = await productModel.createProduct(cleanProductInput(req.body));
  res.status(201).json(toPublicProduct(product));
}

// PUT /api/products/:id  (req 2.5.1) - stock is not editable here, see validateProduct
async function updateProduct(req, res) {
  const errors = validateProduct(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const product = await productModel.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const updated = await productModel.updateProduct(req.params.id, cleanProductInput(req.body));
  res.status(200).json(toPublicProduct(updated));
}

module.exports = { listProducts, getProduct, createProduct, updateProduct };
