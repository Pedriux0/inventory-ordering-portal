const bcrypt = require('bcrypt');

// req 2.1.2: passwords must be at least 16 characters
const MIN_LENGTH = 16;

// cost factor for bcrypt: every +1 doubles the work needed to hash one password
// 12 is slow enough to make brute force expensive but still fast for a normal login
const SALT_ROUNDS = 12;

// req 2.1.2: min 16 chars, one uppercase, one lowercase, one digit
// returns a list of problems, empty list means the password is valid
// we return all the problems at once so the user can fix them in one try
function validatePassword(password) {
  const errors = [];

  // typeof check first because the password comes from the request body,
  // so it could be missing or even a number/object sent by someone testing the api
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }
  // if its not a string we cant run the regex checks below (they would throw)
  if (typeof password !== 'string') {
    return errors;
  }
  // each regex just looks for at least one character of that type anywhere in the password
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return errors;
}

// req 2.1.3: we never store the plain password, only the bcrypt hash (always 60 chars)
// bcrypt generates a random salt for every call and stores it inside the hash itself,
// so two users with the same password still end up with different hashes
// this returns a promise, so callers must use await
function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// used at login: bcrypt reads the salt from the stored hash, hashes the typed password
// with it and compares the result, we cant "decrypt" a hash so this is the only way to check
function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { validatePassword, hashPassword, comparePassword, MIN_LENGTH };
