const { validatePurchaseRequest, validateDecision } = require('../../src/utils/validators');

describe('purchase request validation (req 2.2.5)', () => {
  // UT-10
  test('UT-10 accepts a valid request and rejects a missing product, supplier or quantity', () => {
    expect(validatePurchaseRequest({ productId: 1, supplierId: 2, quantity: 50, note: 'for the weekend' })).toEqual([]);
    expect(validatePurchaseRequest({})).toEqual([
      'A valid product is required',
      'A valid supplier is required',
      'Quantity must be a whole number, 1 or more',
    ]);
  });

  test('rejects zero quantity and a note longer than 255 characters', () => {
    const errors = validatePurchaseRequest({ productId: 1, supplierId: 2, quantity: 0, note: 'x'.repeat(256) });
    expect(errors).toEqual(['Quantity must be a whole number, 1 or more', 'Note must be text, 255 characters or less']);
  });
});

describe('decision validation (req 2.2.5)', () => {
  // UT-11
  test('UT-11 declining needs a reason, approving does not', () => {
    expect(validateDecision({ decision: 'Approved' })).toEqual([]);
    expect(validateDecision({ decision: 'Declined', note: '  ' })).toEqual(['A reason is required when declining']);
    expect(validateDecision({ decision: 'Declined', note: 'Too expensive this month' })).toEqual([]);
  });

  test('only Approved or Declined are valid decisions', () => {
    expect(validateDecision({ decision: 'Maybe' })).toEqual(['decision must be Approved or Declined']);
  });
});
