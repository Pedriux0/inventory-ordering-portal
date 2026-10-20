// stock math lives here, the models call these inside a db transaction
// keeping it as plain functions means we can unit test it without a database

// thrown when a stock change cant happen (product missing, not enough stock, etc)
// the message is safe to show to the user, the controller turns it into a 4xx answer
class StockError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// UT-03 (reqs 2.4.1, 2.4.2): receiving stock adds to what we have
function calculateStockAfterReceipt(currentStock, quantityReceived) {
  return currentStock + quantityReceived;
}

// UT-04 (req 2.5.3): an order takes stock away, but never below zero
function calculateStockAfterOrder(currentStock, quantitySold) {
  if (quantitySold > currentStock) {
    throw new StockError(`Not enough stock: ${currentStock} available, ${quantitySold} requested`, 409);
  }
  return currentStock - quantitySold;
}

// a product is "low stock" when it reached its reorder level (used by the inventory view)
function isLowStock(currentStock, reorderLevel) {
  return currentStock <= reorderLevel;
}

module.exports = { StockError, calculateStockAfterReceipt, calculateStockAfterOrder, isLowStock };
