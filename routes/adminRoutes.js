const express = require('express');
const router = express.Router();
const { registerAdmin, verifyActivation, loginAdmin, forgotPassword, resendActivationCode, resetPassword } = require('../controllers/adminAuthController');

router.post('/register', registerAdmin);
router.post('/verify-activation', verifyActivation);
router.post('/login', loginAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/resend-code', resendActivationCode);
router.put('/reset-password/:resetToken', resetPassword);

module.exports = router;