const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyEmail, activateAccount,  changePassword, getUserProfile, updateUserProfile, resendCode, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify/:token', verifyEmail);
router.post('/activate', activateAccount);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/change-password', changePassword); 
router.post('/resend-code', resendCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;