const { validateSupplier } = require('../../src/utils/validators');

describe('supplier validation (req 2.4.4)', () => {
  // UT-08
  test('UT-08 rejects a supplier with no name', () => {
    const errors = validateSupplier({ contactEmail: 'sales@acme.com' });

    expect(errors).toContain('Supplier name is required');
  });

  test('rejects a name that is only spaces', () => {
    expect(validateSupplier({ supplierName: '   ' })).toContain('Supplier name is required');
  });

  test('rejects a name longer than the VARCHAR(128) column', () => {
    expect(validateSupplier({ supplierName: 'a'.repeat(129) })).toContain(
      'Supplier name must be 128 characters or less'
    );
  });

  test('accepts a supplier with only a name, contact info is optional', () => {
    expect(validateSupplier({ supplierName: 'Acme Supplies' })).toEqual([]);
  });

  test('accepts a full valid supplier', () => {
    expect(
      validateSupplier({
        supplierName: 'Acme Supplies',
        contactEmail: 'sales@acme.com',
        contactPhone: '+1 (555) 123-4567',
      })
    ).toEqual([]);
  });

  test('rejects a bad email and a bad phone, and reports both', () => {
    const errors = validateSupplier({
      supplierName: 'Acme Supplies',
      contactEmail: 'not-an-email',
      contactPhone: 'call me maybe',
    });

    expect(errors).toEqual(['Contact email is not valid', 'Contact phone is not valid']);
  });
});
