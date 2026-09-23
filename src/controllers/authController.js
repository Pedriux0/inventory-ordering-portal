const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const { comparePassword } = require('../utils/password');
const { signToken, generateResetToken } = require('../utils/token');

// same message for every kind of failure, so an attacker cant tell if the email exists
const INVALID_CREDENTIALS = 'Invalid email or password';

// POST /api/auth/login  (req 2.1.1)
async function login(req, res) {
  const { email, password } = req.body;

  // both values must be text, this also stops someone from sending objects to the database
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // emails are stored in lowercase, so we clean it up before searching
  const cleanEmail = email.trim().toLowerCase();
  const user = await userModel.findByEmail(cleanEmail);

  // step 1: find out if the login is valid and, if not, why (the reason only goes to the log)
  let failureReason = null;
  if (!user) {
    failureReason = 'unknown email';
  } else if (!user.is_active) {
    failureReason = 'account is deactivated'; // req 2.3.4, deactivated users cant log in
  } else if (!(await comparePassword(password, user.password_hash))) {
    failureReason = 'wrong password';
  }

  // step 2: if it failed, save it in the audit log (req 3.2.2) and answer 401
  if (failureReason) {
    await auditLogModel.logEvent({
      userId: user ? user.user_id : null, // user id only when we know who it was
      action: 'LOGIN_FAILED',
      details: `Failed login for ${cleanEmail}: ${failureReason}`,
      ipAddress: req.ip,
    });
    return res.status(401).json({ error: INVALID_CREDENTIALS });
  }

  // step 3: login is valid, give the user their token
  // we never send password_hash back, only the fields the profile needs (req 2.2.2)
  res.status(200).json({
    token: signToken(user),
    user: {
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  });
}

// POST /api/auth/logout  (req 2.1.4)
// the JWT itself cant be "cancelled" on the server, so logging out just means the
// client throws away its token, we still record the event and confirm with 200
async function logout(req, res) {
  await auditLogModel.logEvent({
    userId: req.user.userId,
    action: 'LOGOUT',
    ipAddress: req.ip,
  });
  res.status(200).json({ message: 'Logged out successfully' });
}

// POST /api/auth/resetpassword  (req 2.1.5, API-08)
// generates a reset token, we dont have an email server set up yet so for now
// the token is only stored, not sent anywhere, next step will add the email part
async function requestPasswordReset(req, res) {
  const { email } = req.body;

  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await userModel.findByEmail(cleanEmail);

  // only generate and store a token if the account exists, but always answer the
  // same way, so this endpoint cant be used to check which emails have an account
  if (user) {
    const { hash, expiresAt } = generateResetToken();
    await userModel.setResetToken(user.user_id, hash, expiresAt);
  }

  res.status(200).json({ message: 'If that email exists, a reset token has been generated' });
}

module.exports = { login, logout, requestPasswordReset };
