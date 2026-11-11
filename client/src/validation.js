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

// purchase request (req 2.2.5): product, supplier, quantity 1+, optional short note
export function requestErrors(form) {
  const errors = {};
  if (!form.productId) errors.productId = 'Choose a product';
  if (!form.supplierId) errors.supplierId = 'Choose a supplier';
  if (!isWhole(form.quantity) || Number(form.quantity) < 1) errors.quantity = 'Enter a whole number, 1 or more';
  if (form.note.length > 255) errors.note = 'Keep the note under 255 characters';
  return errors;
}

// declining a request needs a reason, so the person who asked knows why
export function declineErrors(reason) {
  return reason.trim() ? {} : { reason: 'Write a reason, so the person who asked knows why' };
}

// password rules from src/utils/password.js (req 2.1.2): 16+ characters, upper, lower and a number
export function passwordError(password) {
  if (password.length < 16) return 'Use at least 16 characters';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Use upper case, lower case and at least one number';
  }
  return null;
}

// new account (Admin, req 2.2.6)
export function userErrors(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Full name is required';
  if (!isEmail(form.email.trim())) errors.email = 'Enter an email like name@company.com';
  const password = passwordError(form.password);
  if (password) errors.password = password;
  return errors;
}

// profile details (req 2.3.2)
export function profileErrors(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Full name is required';
  if (!isEmail(form.email.trim())) errors.email = 'Enter an email like name@company.com';
  return errors;
}

// change password (req 2.3.3)
export function changePasswordErrors(form) {
  const errors = {};
  if (!form.currentPassword) errors.currentPassword = 'Enter your current password';
  const password = passwordError(form.newPassword);
  if (password) errors.newPassword = password;
  else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = 'The new passwords do not match';
  return errors;
}
