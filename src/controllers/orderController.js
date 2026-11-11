const orderModel = require('../models/orderModel');
const { validateOrder } = require('../utils/validators');
const { StockError } = require('../utils/stock');
const { parsePaging, readSearch, readId, isIsoDate } = require('../utils/listQuery');

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
// week 7: ?search= an order number ("12" or "#12") or a date ("2026-10-01") (req 2.6.2),
// ?page=&limit= (req 2.6.4). The total that match goes in the X-Total-Count header
async function listOrders(req, res) {
  const search = readSearch(req.query.search);
  const filters = {};
  if (search) {
    if (readId(search)) filters.orderId = readId(search);
    else if (isIsoDate(search)) filters.orderDate = search;
    else return res.status(400).json({ error: 'Search orders by order number (e.g. 12) or date (YYYY-MM-DD)' });
  }
  const paging = parsePaging(req.query);
  if (paging.error) {
    return res.status(400).json({ error: paging.error });
  }

  const { rows, total } = await orderModel.findAll({
    ...filters,
    limit: paging.paged ? paging.limit : undefined,
    offset: paging.paged ? paging.offset : 0,
  });
  res.set('X-Total-Count', String(total));
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
