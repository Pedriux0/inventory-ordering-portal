const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const RESET_TOKEN_VALID_HOURS = 1;

// creates the JWT that the user sends back on every request (API-01)
// we only put the id and the role inside, never the password or anything sensitive
// the token is signed with our secret, so nobody can change the role without us noticing
function signToken(user) {
  // fail early with a clear message if the secret was not set in .env
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// req 2.1.5: a secure, random reset token
// we only ever store the hash of it in the database (same idea as a password),
// so a stolen database backup cant be used to reset anyone's password
// raw is what would be emailed to the user, expiresAt is when it stops working
function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_VALID_HOURS * 60 * 60 * 1000);
  return { raw, hash, expiresAt };
}

module.exports = { signToken, generateResetToken };
