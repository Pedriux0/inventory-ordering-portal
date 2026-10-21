// checks the forms in the browser BEFORE sending them, so errors show up next to the
// right field straight away (docs/UI_RESEARCH.md section F)
// the messages match src/utils/validators.js on the server. The server still checks
// everything again: these are only for a faster, friendlier experience, not for security
// each function returns { fieldName: 'message' }, an empty object means valid

const isWhole = (text) => /^\d+$/.test(String(text).trim());
const isEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

export function productErrors(form, { isNew }) {
  const errors = {};
  if (!form.productName.trim()) errors.productName = 'Product name is required';

  const price = Number(form.unitPrice);
  if (form.unitPrice === '' || !Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(form.unitPrice.trim())) {
    errors.unitPrice = 'Enter a price like 49.99 (at most 2 decimals)';
  }
  if (isNew && !isWhole(form.currentStock)) errors.currentStock = 'Enter a whole number, 0 or more';
  if (form.reorderLevel !== '' && !isWhole(form.reorderLevel)) errors.reorderLevel = 'Enter a whole number, 0 or more';
  return errors;
}

export function supplierErrors(form) {
  const errors = {};
  if (!form.supplierName.trim()) errors.supplierName = 'Supplier name is required';
  if (form.contactEmail.trim() && !isEmail(form.contactEmail.trim())) errors.contactEmail = 'Enter an email like name@company.com';
  if (form.contactPhone.trim() && !/^[0-9+()\-\s]{7,20}$/.test(form.contactPhone.trim())) {
    errors.contactPhone = 'Use digits and + ( ) -, 7 to 20 characters';
  }
  return errors;
}

export function receiptErrors(form) {
  const errors = {};
  if (!form.productId) errors.productId = 'Choose a product';
  if (!form.supplierId) errors.supplierId = 'Choose a supplier';
  if (!isWhole(form.quantity) || Number(form.quantity) < 1) errors.quantity = 'Enter a whole number, 1 or more';
  if (!form.dateReceived) errors.dateReceived = 'Choose the date the stock arrived';
  return errors;
}

// one order line: product chosen, quantity 1+ and not more than what is in stock
export function orderLineErrors(line, product) {
  const errors = {};
  if (!line.productId) errors.productId = 'Choose a product';
  if (!isWhole(line.quantity) || Number(line.quantity) < 1) {
    errors.quantity = 'Enter 1 or more';
  } else if (product && Number(line.quantity) > product.currentStock) {
    errors.quantity = `Only ${product.currentStock} in stock`;
  }
  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
