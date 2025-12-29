const Admin = require('../models/Admin');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1d', // Token expires in 24 hours
  });
};

// @desc    Register Admin
const registerAdmin = async (req, res) => {
  const { name, email, password, adminSecret } = req.body;
  
  try {
    // 1. Security Check for Secret Key
    const SECRET = process.env.ADMIN_SECRET; 
    if (adminSecret !== SECRET) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid Admin Secret Key. Registration denied.' 
      });
    }

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // 2. Create Admin (Model hashes password automatically)
    const admin = await Admin.create({ name, email, password });
    
    res.status(201).json({ 
      success: true, 
      token: generateToken(admin._id),
      admin: { id: admin._id, name: admin.name, email: admin.email } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    
    // Check if admin exists AND if password matches using Schema method
    if (admin && (await admin.matchPassword(password))) {
      res.json({ 
        success: true, 
        token: generateToken(admin._id), // Sends the token to frontend
        admin: { id: admin._id, name: admin.name, email: admin.email } 
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update Admin Profile
const updateProfile = async (req, res) => {
  const { email, name, currentEmail } = req.body;
  try {
    const admin = await Admin.findOneAndUpdate(
      { email: currentEmail }, 
      { name, email }, 
      { new: true }
    );
    res.json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Update Admin Password
const updatePassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    
    if (admin && (await admin.matchPassword(currentPassword))) {
      admin.password = newPassword; 
      await admin.save(); // pre-save hook hashes newPassword
      res.json({ success: true, message: 'Password updated successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 
    await admin.save();

    const frontendUrl = "https://futo-hostels-frontend.onrender.com"; 
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const msg = {
      to: admin.email,
      from: process.env.EMAIL_FROM,
      subject: 'Admin Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; text-align: center;">
          <h2 style="color: #1a5c2a;">Password Reset Request</h2>
          <p>You requested to reset your admin password. Click the link below:</p>
          <a href="${resetUrl}" style="background: #1a5c2a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
      `,
    };

    await sgMail.send(msg);
    res.status(200).json({ success: true, data: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc    Resend Code
const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ success: false, message: 'Email not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    admin.resetPasswordToken = crypto.createHash('sha256').update(code).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await admin.save();

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM,
      subject: 'Your Password Reset Code',
      html: `<h3>Your reset code is: <span style="color: #1a5c2a;">${code}</span></h3>`,
    };

    await sgMail.send(msg);
    res.status(200).json({ success: true, data: 'Code resent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resend code' });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  updateProfile,
  updatePassword,
  forgotPassword,
  resendCode
};