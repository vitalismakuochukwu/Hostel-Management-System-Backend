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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
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