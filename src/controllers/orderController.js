const orderModel = require('../models/orderModel');
const { validateOrder } = require('../utils/validators');
const { StockError } = require('../utils/stock');

// POST /api/orders  (req 2.5.3, API-04) - process a sales order
// body: { items: [{ productId, quantity }, ...] }
async function createOrder(req, res) {
  const errors = validateOrder(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const items = req.body.items.map(({ productId, quantity }) => ({ productId, quantity }));
  try {
    // who made the order comes from the token, not the request body
    const order = await orderModel.createOrder(req.user.userId, items);
    res.status(201).json(order);
  } catch (err) {
    // not enough stock / unknown product: clear 4xx message, nothing was saved
    if (err instanceof StockError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

// GET /api/orders - order history, newest first
async function listOrders(req, res) {
  const rows = await orderModel.findAll();
  res.status(200).json(
    rows.map((row) => ({
      orderId: row.order_id,
      orderDate: row.order_date,
      totalAmount: Number(row.total_amount),
      createdBy: row.created_by_name,
      lineCount: Number(row.line_count),
      unitCount: Number(row.unit_count),
    }))
  );
}

// GET /api/orders/:id - one order with its lines
async function getOrder(req, res) {
  const order = await orderModel.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.status(200).json({
    orderId: order.order_id,
    orderDate: order.order_date,
    totalAmount: Number(order.total_amount),
    createdBy: order.created_by_name,
    items: order.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity_sold,
      unitPrice: Number(item.unit_price_at_sale),
    })),
  });
}

module.exports = { createOrder, listOrders, getOrder };
