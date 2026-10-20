const { validateProduct, validateReceipt, validateOrder } = require('../../src/utils/validators');

const VALID_PRODUCT = {
  productName: 'Ergonomic Desk Lamp LED',
  description: 'Adjustable LED desk lamp',
  unitPrice: 49.99,
  currentStock: 75,
  reorderLevel: 15,
};

describe('product validation (req 2.4.1)', () => {
  // UT-05
  test('UT-05 rejects a product with no name', () => {
    const errors = validateProduct({ ...VALID_PRODUCT, productName: undefined }, { isNew: true });
    expect(errors).toContain('Product name is required');
  });

  test('accepts a valid new product', () => {
    expect(validateProduct(VALID_PRODUCT, { isNew: true })).toEqual([]);
  });

  test('prices like 19.99 are fine even though 19.99 * 100 is not exact in javascript', () => {
    expect(validateProduct({ ...VALID_PRODUCT, unitPrice: 19.99 }, { isNew: true })).toEqual([]);
  });

  test('rejects a negative price, a price with 3 decimals, and a price sent as text', () => {
    for (const unitPrice of [-1, 1.999, '49.99']) {
      expect(validateProduct({ ...VALID_PRODUCT, unitPrice }, { isNew: true })).toContain(
        'Unit price must be a positive amount with at most 2 decimals'
      );
    }
  });

  test('initial stock is required on create, must be a whole number', () => {
    expect(validateProduct({ ...VALID_PRODUCT, currentStock: undefined }, { isNew: true })).toContain(
      'Initial stock must be a whole number, 0 or more'
    );
    expect(validateProduct({ ...VALID_PRODUCT, currentStock: 2.5 }, { isNew: true })).toContain(
      'Initial stock must be a whole number, 0 or more'
    );
  });

  test('stock is not required on update (it only changes through receipts and orders)', () => {
    expect(validateProduct({ ...VALID_PRODUCT, currentStock: undefined })).toEqual([]);
  });
});

describe('receipt validation (req 2.4.2)', () => {
  const VALID_RECEIPT = { productId: 1, supplierId: 2, quantity: 25, dateReceived: '2026-10-01' };

  test('accepts a valid receipt', () => {
    expect(validateReceipt(VALID_RECEIPT)).toEqual([]);
  });

  test('rejects zero quantity, a fake date and a future date', () => {
    expect(validateReceipt({ ...VALID_RECEIPT, quantity: 0 })).toContain(
      'Quantity must be a whole number, 1 or more'
    );
    expect(validateReceipt({ ...VALID_RECEIPT, dateReceived: '2026-02-30' })).toContain(
      'Date received must be a valid date, not in the future'
    );
    expect(validateReceipt({ ...VALID_RECEIPT, dateReceived: '2999-01-01' })).toContain(
      'Date received must be a valid date, not in the future'
    );
  });
});

describe('order validation (req 2.4.3)', () => {
  test('accepts an order with several products', () => {
    expect(
      validateOrder({ items: [{ productId: 1, quantity: 5 }, { productId: 2, quantity: 1 }] })
    ).toEqual([]);
  });

  test('rejects an empty order', () => {
    expect(validateOrder({ items: [] })).toEqual(['An order needs at least one product']);
    expect(validateOrder({})).toEqual(['An order needs at least one product']);
  });

  test('rejects the same product twice and a zero quantity', () => {
    const errors = validateOrder({
      items: [{ productId: 1, quantity: 5 }, { productId: 1, quantity: 0 }],
    });
    expect(errors).toEqual(['Line 2: product is already in the order', 'Line 2: quantity must be 1 or more']);
  });
});
