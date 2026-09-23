const pool = require('../config/db');

// saves a security event in the audit_logs table (reqs 3.2.2 and 3.2.3)
// the timestamp is filled by the database (created_at column)
// userId can be null, for example when someone tries to log in with an email that doesnt exist
async function logEvent({ userId = null, action, details = null, ipAddress = null }) {
  await pool.execute(
    'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    [userId, action, details, ipAddress]
  );
}

module.exports = { logEvent };
