const jwt = require('jsonwebtoken');
const auditLogModel = require('../models/auditLogModel');

// checks that the request has a valid JWT (req 2.1.1)
// on success it attaches req.user = { userId, role } so later code can trust it
// this must run before requireRole, since requireRole reads req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization; // expected: "Bearer <token>"
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // covers both a bad signature and an expired token
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// req 2.2.3: only lets the request continue if req.user.role is one of the allowed roles
// req 3.2.3: every denied attempt is logged with the user, role and the action they tried
// usage: requireRole('Admin') or requireRole('Admin', 'Manager')
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    await auditLogModel.logEvent({
      userId: req.user.userId,
      action: 'ACCESS_DENIED',
      details: `role ${req.user.role} tried ${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
    });
    res.status(403).json({ error: 'You do not have permission to perform this action' });
  };
}

module.exports = { authenticate, requireRole };
