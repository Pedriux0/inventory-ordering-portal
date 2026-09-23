const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/resetpassword - anyone can request one, no login needed
router.post('/resetpassword', authController.requestPasswordReset);

// POST /api/auth/logout - must be logged in to log out
router.post('/logout', authenticate, authController.logout);

module.exports = router;
