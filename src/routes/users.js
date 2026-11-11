const express = require('express');
const validateId = require('../middleware/validateId');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// :id must be a plain whole number, anything else is 404 (see middleware/validateId.js)
router.param('id', validateId);

// every route below needs a valid login first
router.use(authenticate);

// self-service profile, any logged in role can use these (reqs 2.3.1 - 2.3.3)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/password', userController.changePassword);

// admin-only account management (req 2.2.6)
router.get('/', requireRole('Admin'), userController.listUsers);
router.post('/', requireRole('Admin'), userController.createUser);
router.get('/:id/account', requireRole('Admin'), userController.getAccount);
router.put('/:id/role', requireRole('Admin'), userController.updateRole);
router.put('/:id/status', requireRole('Admin'), userController.updateStatus);

module.exports = router;
