// req 2.3.2: full name and email are validated before saving

// good enough check for "something@something.something", not a full RFC parser
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// must be non empty text and fit the VARCHAR(128) column in the users table
function validateFullName(fullName) {
  return typeof fullName === 'string' && fullName.trim().length > 0 && fullName.length <= 128;
}

// req 2.4.4, UT-08: checks a supplier before it is saved
// name is required, email and phone are optional but must be valid if given
// returns a list of every problem found (empty list = valid), same idea as validatePassword
// limits match the columns in the suppliers table
function validateSupplier({ supplierName, contactEmail, contactPhone } = {}) {
  const errors = [];

  if (typeof supplierName !== 'string' || supplierName.trim().length === 0) {
    errors.push('Supplier name is required');
  } else if (supplierName.trim().length > 128) {
    errors.push('Supplier name must be 128 characters or less');
  }

  // optional fields: only checked when the client actually sent something
  if (contactEmail !== undefined && contactEmail !== null && contactEmail !== '') {
    if (!validateEmail(contactEmail) || contactEmail.length > 254) {
      errors.push('Contact email is not valid');
    }
  }

  if (contactPhone !== undefined && contactPhone !== null && contactPhone !== '') {
    // digits plus the usual phone symbols, like "+1 (555) 123-4567"
    if (typeof contactPhone !== 'string' || !/^[0-9+()\-\s]{7,20}$/.test(contactPhone)) {
      errors.push('Contact phone is not valid');
    }
  }

  return errors;
}

// whole number, zero or more (stock, reorder level)
function isWholeNumber(value) {
  return Number.isInteger(value) && value >= 0;
}

// whole number, one or more (ids, quantities)
function isPositiveWholeNumber(value) {
  return Number.isInteger(value) && value > 0;
}

// req 2.4.1, UT-05: checks a product before it is saved
// isNew = true on create, then the starting stock is also required
// on update the stock is NOT editable here, it only changes through receipts and orders,
// so the stock number always matches the history in inventory_receipts and order_items
function validateProduct(
  { productName, description, unitPrice, currentStock, reorderLevel } = {},
  { isNew = false } = {}
) {
  const errors = [];

  if (typeof productName !== 'string' || productName.trim().length === 0) {
    errors.push('Product name is required');
  } else if (productName.trim().length > 128) {
    errors.push('Product name must be 128 characters or less');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('Description must be text');
  }

  // DECIMAL(10,2) in the schema: max 99,999,999.99 and at most 2 decimals
  // (19.99 * 100 is 1998.9999... in javascript, so we allow a tiny rounding gap)
  const hasTwoDecimalsMax =
    Number.isFinite(unitPrice) && Math.abs(Math.round(unitPrice * 100) - unitPrice * 100) < 1e-6;
  if (!hasTwoDecimalsMax || unitPrice < 0 || unitPrice > 99999999.99) {
    errors.push('Unit price must be a positive amount with at most 2 decimals');
  }

  if (isNew && !isWholeNumber(currentStock)) {
    errors.push('Initial stock must be a whole number, 0 or more');
  }

  // reorder level is optional, the column defaults to 0
  if (reorderLevel !== undefined && !isWholeNumber(reorderLevel)) {
    errors.push('Reorder level must be a whole number, 0 or more');
  }

  return errors;
}

// "YYYY-MM-DD" that is a real calendar date and not in the future
function isValidPastDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  // compare as text, works because the format is fixed width
  // we allow up to tomorrow in UTC, because for users ahead of UTC "today" can already be tomorrow
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return value <= tomorrowUtc;
}

// req 2.4.2: checks an inventory receipt before it is saved (API-09)
function validateReceipt({ productId, supplierId, quantity, dateReceived } = {}) {
  const errors = [];
  if (!isPositiveWholeNumber(productId)) errors.push('A valid product is required');
  if (!isPositiveWholeNumber(supplierId)) errors.push('A valid supplier is required');
  if (!isPositiveWholeNumber(quantity)) errors.push('Quantity must be a whole number, 1 or more');
  if (!isValidPastDate(dateReceived)) errors.push('Date received must be a valid date, not in the future');
  return errors;
}

// req 2.4.3: checks a sales order before it is processed (API-04)
// items = [{ productId, quantity }, ...], each product can only appear once
function validateOrder({ items } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return ['An order needs at least one product'];
  }

  const errors = [];
  const seen = new Set();
  items.forEach((item, i) => {
    const line = `Line ${i + 1}`;
    if (!item || !isPositiveWholeNumber(item.productId)) {
      errors.push(`${line}: a valid product is required`);
      return;
    }
    if (seen.has(item.productId)) errors.push(`${line}: product is already in the order`);
    seen.add(item.productId);
    if (!isPositiveWholeNumber(item.quantity)) errors.push(`${line}: quantity must be 1 or more`);
  });
  return errors;
}

module.exports = {
  validateEmail,
  validateFullName,
  validateSupplier,
  validateProduct,
  validateReceipt,
  validateOrder,
};
