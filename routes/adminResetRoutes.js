const express = require('express');
const router = express.Router();
const crypto = require('crypto');
// Assuming Admin model exists in models/Admin.js. If you use User model for admins, change this to require('../models/User')
const Admin = require('../models/Admin'); 

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    // Note: Ensure your Admin schema has 'resetPasswordToken' and 'resetPasswordExpire' fields
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await admin.save();

    // Create Reset URL (Pointing to frontend reset page)
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Simulate Sending Email
    console.log(`\n\n--- PASSWORD RESET EMAIL ---\nTo: ${email}\nLink: ${resetUrl}\n----------------------------\n`);

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;