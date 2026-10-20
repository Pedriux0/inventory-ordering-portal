const inventoryModel = require('../models/inventoryModel');
const { validateReceipt } = require('../utils/validators');
const { StockError, isLowStock } = require('../utils/stock');

// GET /api/inventory  (req 2.5.4, API-10) - current stock of every product
async function getInventory(req, res) {
  const rows = await inventoryModel.findStockLevels();
  res.status(200).json(
    rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      currentStock: row.current_stock,
      reorderLevel: row.reorder_level,
      lowStock: isLowStock(row.current_stock, row.reorder_level),
    }))
  );
}

// POST /api/inventory/receipts  (req 2.5.2, API-09) - record stock that arrived
async function createReceipt(req, res) {
  const errors = validateReceipt(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  const { productId, supplierId, quantity, dateReceived } = req.body;
  try {
    const receipt = await inventoryModel.createReceipt({
      productId,
      supplierId,
      quantity,
      dateReceived,
      receivedBy: req.user.userId, // who recorded it comes from the token, not the request body
    });
    res.status(201).json(receipt);
  } catch (err) {
    // known problems (missing product, deactivated supplier) get a clear 4xx message,
    // anything else goes to the error handler as a generic 500
    if (err instanceof StockError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

// GET /api/inventory/receipts - latest receipts for the inventory page
async function listReceipts(req, res) {
  const rows = await inventoryModel.findRecentReceipts();
  res.status(200).json(
    rows.map((row) => ({
      receiptId: row.receipt_id,
      productName: row.product_name,
      supplierName: row.supplier_name,
      quantityReceived: row.quantity_received,
      dateReceived: row.date_received,
      receivedBy: row.received_by_name,
    }))
  );
}

module.exports = { getInventory, createReceipt, listReceipts };
