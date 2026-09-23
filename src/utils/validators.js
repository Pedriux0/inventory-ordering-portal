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

module.exports = { validateEmail, validateFullName };
