// backend/routes/authRoutes.js
const express = require('express');
const {
    registerUser,
    loginUser,
    getUserDetails,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const protect = require('../middleware/authMiddleware'); // Our authentication middleware

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword); // Public route to request reset token
router.post('/reset-password', resetPassword);   // Public route to reset password with token

// Protected route to get user details (requires a valid JWT token)
router.get('/user/details', protect, getUserDetails);

module.exports = router;

