const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @route   POST /api/admin/auth/login
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    // Verify Admin Secret (You should use process.env.ADMIN_SECRET in production)
    if (!adminSecret) {
      return res.status(403).json({ success: false, message: 'Admin secret is required' });
    }

    const userExists = await Admin.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    // Generate 6-digit Activation Code
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const admin = await Admin.create({
      name,
      email,
      password, // Assumes your Admin model hashes password in pre-save hook
      isVerified: false,
      activationCode
    });

    if (admin) {
      try {
        await sendEmail({
          to: admin.email,
          subject: 'Admin Account Activation Code',
          text: `Your activation code is: ${activationCode}`
        });
      } catch (emailError) {
        console.error('Failed to send activation email:', emailError);
      }

      res.status(201).json({ 
        success: true, 
        message: 'Registration successful! Please check your email for the activation code.' 
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid admin data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      // Check if account is verified
      if (admin.isVerified === false) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account not activated', 
          requireActivation: true 
        });
      }

      res.json({
        success: true,
        token: generateToken(admin._id),
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/auth/verify
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const admin = await Admin.findOne({ email });

    if (admin && admin.activationCode === code) {
      admin.isVerified = true;
      admin.activationCode = undefined; // Clear code after usage
      await admin.save();

      res.json({
        success: true,
        token: generateToken(admin._id),
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
        },
        message: 'Account activated successfully'
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid activation code' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/auth/resend-code
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.isVerified) return res.status(400).json({ message: 'Account already verified' });

    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    admin.activationCode = activationCode;
    await admin.save();

    await sendEmail({
      to: admin.email,
      subject: 'Resend: Admin Activation Code',
      text: `Your new activation code is: ${activationCode}`
    });

    res.json({ success: true, message: 'Activation code resent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/auth/update-password
router.put('/update-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const admin = await Admin.findById(decoded.id);

    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (await admin.matchPassword(req.body.currentPassword)) {
      admin.password = req.body.newPassword;
      await admin.save();

      try {
        await sendEmail({
          to: admin.email,
          subject: 'Security Alert: Admin Password Changed',
          text: `Hello ${admin.name},\n\nYour admin password was successfully changed. If you did not perform this action, please contact support immediately.`
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      res.json({ success: true, message: 'Password updated successfully' });
    } else {
      res.status(400).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/auth/update-profile
router.put('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const admin = await Admin.findById(decoded.id);

    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // Update email
    if (req.body.email) {
      admin.email = req.body.email;
    }

    await admin.save();

    try {
      await sendEmail({
        to: admin.email,
        subject: 'Admin Profile Updated',
        text: `Hello ${admin.name},\n\nYour admin profile details (email) have been updated successfully.`
      });
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      admin: { id: admin._id, name: admin.name, email: admin.email }
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;