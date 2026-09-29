// Auth routes

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Register user
router.post('/register', AuthController.register);

// Send verification code
router.post('/send-verification', AuthController.sendVerification);

// Verify code
router.post('/verify-code', AuthController.verifyCode);

// Resend verification code
router.post('/resend-verification', AuthController.resendVerification);

// Get verification status
router.get('/verification-status', AuthController.getVerificationStatus);

// Login
router.post('/login', AuthController.login);

module.exports = router;