const userModel = require('../models/userModel');
const { validatePassword, hashPassword, comparePassword } = require('../utils/password');
const { validateEmail, validateFullName } = require('../utils/validators');

const ROLES = ['Staff', 'Manager', 'Admin']; // must match the users.role ENUM in the schema

// shape we send back for a user, never includes the password hash (req 2.2.2)
function toPublicUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    isActive: !!user.is_active,
  };
}

// ---- self-service profile (reqs 2.3.1 - 2.3.3) ----

// GET /api/users/profile
async function getProfile(req, res) {
  const user = await userModel.findById(req.user.userId);
  res.status(200).json(toPublicUser(user));
}

// PUT /api/users/profile  (req 2.3.2)
async function updateProfile(req, res) {
  const { fullName, email } = req.body;

  if (!validateFullName(fullName) || !validateEmail(email)) {
    return res.status(400).json({ error: 'A valid full name and email are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (await userModel.emailExists(cleanEmail, req.user.userId)) {
    return res.status(409).json({ error: 'That email is already in use' });
  }

  const updated = await userModel.updateProfile(req.user.userId, {
    fullName: fullName.trim(),
    email: cleanEmail,
  });
  res.status(200).json(toPublicUser(updated));
}

// PUT /api/users/profile/password  (req 2.3.3, API-13) - must confirm the current password first
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const authRow = await userModel.findAuthById(req.user.userId);
  const currentIsCorrect =
    authRow && (await comparePassword(currentPassword || '', authRow.password_hash));
  if (!currentIsCorrect) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const errors = validatePassword(newPassword);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  await userModel.updatePasswordHash(req.user.userId, await hashPassword(newPassword));
  res.status(200).json({ message: 'Password changed successfully' });
}

// ---- admin account management (reqs 2.2.6, 2.3.4, 2.5.7) ----

// POST /api/users  (req 2.2.6) - create a new account
async function createUser(req, res) {
  const { fullName, email, password, role } = req.body;

  if (!validateFullName(fullName) || !validateEmail(email) || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'fullName, a valid email and a valid role are required' });
  }
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: passwordErrors.join(', ') });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (await userModel.emailExists(cleanEmail)) {
    return res.status(409).json({ error: 'That email is already in use' });
  }

  const user = await userModel.createUser({
    fullName: fullName.trim(),
    email: cleanEmail,
    passwordHash: await hashPassword(password),
    role,
  });
  res.status(201).json(toPublicUser(user));
}

// GET /api/users/:id/account  (reqs 2.2.1, 2.2.2, API-16)
async function getAccount(req, res) {
  const user = await userModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json(toPublicUser(user));
}

// PUT /api/users/:id/role  (req 2.5.7, API-06)
async function updateRole(req, res) {
  const { role } = req.body;
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });
  }

  const user = await userModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = await userModel.updateRole(req.params.id, role);
  res.status(200).json(toPublicUser(updated));
}

// PUT /api/users/:id/status  (req 2.3.4, API-14) - activate / deactivate
async function updateStatus(req, res) {
  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be true or false' });
  }

  const user = await userModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = await userModel.updateStatus(req.params.id, active);
  res.status(200).json(toPublicUser(updated));
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  createUser,
  getAccount,
  updateRole,
  updateStatus,
};
