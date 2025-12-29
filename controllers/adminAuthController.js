const Admin = require('../models/Admin');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// @desc    Register Admin
const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    // Pass the PLAIN password. The Admin model's pre-save hook will hash it.
    const admin = await Admin.create({ name, email, password });
    
    res.status(201).json({ 
      success: true, 
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } 
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
    
    // Check if admin exists AND if password matches
    if (admin && (await admin.matchPassword(password))) {
      res.json({ 
        success: true, 
        admin: { id: admin._id, name: admin.name, email: admin.email } 
      });
    } else {
      // If either fails, return 401
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
      // Just assign the plain new password; pre-save hook will hash it automatically
      admin.password = newPassword; 
      await admin.save();
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
          <p>You requested to reset your admin password. Click the button below to continue:</p>
          <a href="${resetUrl}" style="background: #1a5c2a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
          <p style="font-size: 12px; color: #777;">This link will expire in 10 minutes.</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    res.status(200).json({ success: true, data: 'Reset email sent' });
  } catch (err) {
    console.error("SendGrid Error:", err.response ? err.response.body : err);
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
      html: `<div style="font-family: sans-serif; padding: 20px;">
               <h3>Your reset code is: <span style="color: #1a5c2a;">${code}</span></h3>
             </div>`,
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