const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// every route below needs a valid login first
router.use(authenticate);

// self-service profile, any logged in role can use these (reqs 2.3.1 - 2.3.3)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/password', userController.changePassword);

// admin-only account management (req 2.2.6)
router.post('/', requireRole('Admin'), userController.createUser);
router.get('/:id/account', requireRole('Admin'), userController.getAccount);
router.put('/:id/role', requireRole('Admin'), userController.updateRole);
router.put('/:id/status', requireRole('Admin'), userController.updateStatus);

module.exports = router;
