// const express = require('express');
// const router = express.Router();
// const crypto = require('crypto');
// // Assuming Admin model exists in models/Admin.js. If you use User model for admins, change this to require('../models/User')
// const Admin = require('../models/Admin'); 
// const sgMail = require('@sendgrid/mail');

// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;
//     const admin = await Admin.findOne({ email });

//     if (!admin) {
//       return res.status(404).json({ success: false, message: 'Email not found' });
//     }

//     // Generate Reset Token
//     const resetToken = crypto.randomBytes(20).toString('hex');

//     // Hash token and set to resetPasswordToken field
//     // Note: Ensure your Admin schema has 'resetPasswordToken' and 'resetPasswordExpire' fields
//     admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//     admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

//     await admin.save();

//     // Create Reset URL (Pointing to frontend reset page)
//     // Build the Reset URL using your LIVE frontend URL, not localhost
//     const resetUrl = `https://futo-hostels-frontend.onrender.com/reset-password/${resetToken}`;

//     const msg = {
//       to: admin.email,
//       from: process.env.EMAIL_FROM, // Must be your verified gmail
//       subject: 'Admin Password Reset',
//       html: `
//         <p>You requested a password reset</p>
//         <p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>
//       `,
//     };

//     // THIS is the line that actually sends the email. 
//     await sgMail.send(msg);
//     res.json({ success: true, message: 'Email sent' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const { forgotPassword, loginAdmin, registerAdmin, verifyActivation } = require('../controllers/adminAuthController');

router.post('/login', loginAdmin);
router.post('/verify-activation', verifyActivation);
router.post('/register', registerAdmin);
router.post('/forgot-password', forgotPassword); // Points to the clean controller logic

module.exports = router;