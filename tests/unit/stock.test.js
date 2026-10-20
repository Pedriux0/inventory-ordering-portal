const {
  StockError,
  calculateStockAfterReceipt,
  calculateStockAfterOrder,
  isLowStock,
} = require('../../src/utils/stock');

describe('stock math', () => {
  // UT-03 (reqs 2.4.1, 2.4.2)
  test('UT-03 stock after a receipt: 50 + 25 = 75', () => {
    expect(calculateStockAfterReceipt(50, 25)).toBe(75);
  });

  // UT-04 (req 2.5.3)
  test('UT-04 stock after an order: 75 - 10 = 65', () => {
    expect(calculateStockAfterOrder(75, 10)).toBe(65);
  });

  test('an order can use up exactly all the stock', () => {
    expect(calculateStockAfterOrder(10, 10)).toBe(0);
  });

  test('an order bigger than the stock is refused, stock never goes negative', () => {
    expect(() => calculateStockAfterOrder(5, 6)).toThrow(StockError);
    expect(() => calculateStockAfterOrder(5, 6)).toThrow('Not enough stock: 5 available, 6 requested');
  });

  test('low stock means at or below the reorder level', () => {
    expect(isLowStock(15, 15)).toBe(true);
    expect(isLowStock(3, 15)).toBe(true);
    expect(isLowStock(16, 15)).toBe(false);
  });
});
