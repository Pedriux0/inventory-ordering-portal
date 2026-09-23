const pool = require('../config/db');

// all the sql for the users table lives in this file
// we always use ? placeholders and pass the values separately, so user input is never
// glued into the sql text (this is what protects us from sql injection, req 3.1.1)

// used only at login, its the one place we need the password hash
async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT user_id, full_name, email, password_hash, role, is_active FROM users WHERE email = ?',
    [email]
  );
  return rows[0];
}

// public view of a user, never includes the password hash (req 2.2.2)
async function findById(userId) {
  const [rows] = await pool.execute(
    'SELECT user_id, full_name, email, role, is_active FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0];
}

// used only when we need to check the current password (change password flow)
async function findAuthById(userId) {
  const [rows] = await pool.execute(
    'SELECT user_id, password_hash FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0];
}

// keeps emails unique, excludeUserId lets a user "update" their profile with their own email
async function emailExists(email, excludeUserId = 0) {
  const [rows] = await pool.execute(
    'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
    [email, excludeUserId]
  );
  return rows.length > 0;
}

// req 2.2.6: admin creates a new account
async function createUser({ fullName, email, passwordHash, role }) {
  const [result] = await pool.execute(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [fullName, email, passwordHash, role]
  );
  return findById(result.insertId);
}

// req 2.5.7: admin assigns/changes a role
async function updateRole(userId, role) {
  await pool.execute('UPDATE users SET role = ? WHERE user_id = ?', [role, userId]);
  return findById(userId);
}

// req 2.3.4: admin activates/deactivates an account
async function updateStatus(userId, isActive) {
  await pool.execute('UPDATE users SET is_active = ? WHERE user_id = ?', [isActive, userId]);
  return findById(userId);
}

// req 2.3.2: user updates their own name and email
async function updateProfile(userId, { fullName, email }) {
  await pool.execute('UPDATE users SET full_name = ?, email = ? WHERE user_id = ?', [
    fullName,
    email,
    userId,
  ]);
  return findById(userId);
}

// req 2.3.3: user changes their password (after the controller confirmed the old one)
async function updatePasswordHash(userId, passwordHash) {
  await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [
    passwordHash,
    userId,
  ]);
}

// req 2.1.5: saves the hashed reset token and when it expires
async function setResetToken(userId, tokenHash, expiresAt) {
  await pool.execute(
    'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE user_id = ?',
    [tokenHash, expiresAt, userId]
  );
}

module.exports = {
  findByEmail,
  setResetToken,
  findById,
  findAuthById,
  emailExists,
  createUser,
  updateRole,
  updateStatus,
  updateProfile,
  updatePasswordHash,
};
