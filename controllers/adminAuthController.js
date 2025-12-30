const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

// Ensure you have your API Key set in .env
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- Helper to Send Email ---
const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'admin@futohostels.com', // Replace with your verified sender
    subject,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log('Email sent to ' + to);
  } catch (error) {
    console.error('Email Send Error:', error);
  }
};

// --- Register Admin ---
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let admin = await Admin.findOne({ email });
    if (admin) return res.status(400).json({ message: 'Admin already exists' });

    // Generate 6-digit Activation Code
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    admin = new Admin({
      name,
      email,
      password,
      activationCode,
      activationCodeExpires,
      isVerified: false
    });

    await admin.save();

    // Send Activation Email
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px;">
          <h2 style="color: #14532d;">Admin Activation</h2>
          <p>Your activation code is:</p>
          <h1 style="color: #eab308; letter-spacing: 5px;">${activationCode}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      </div>
    `;

    await sendEmail(email, 'Your Admin Activation Code', emailTemplate);

    res.status(201).json({ message: 'Registration successful. Please check your email for the activation code.', email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Verify Activation Code ---
exports.verifyActivation = async (req, res) => {
  try {
    const { email, code } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(400).json({ message: 'Admin not found' });
    if (admin.isVerified) return res.status(400).json({ message: 'Account already verified' });

    if (admin.activationCode !== code || admin.activationCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    admin.isVerified = true;
    admin.activationCode = undefined;
    admin.activationCodeExpires = undefined;
    await admin.save();

    res.json({ success: true, message: 'Account verified successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Login Admin ---
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(400).json({ message: 'Invalid Credentials' });
    
    // Check Verification
    if (!admin.isVerified) {
      return res.status(403).json({ message: 'Account not verified. Please verify your email.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Forgot Password ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Email not found' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await admin.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    
    const message = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    `;

    await sendEmail(admin.email, 'Password Reset', message);

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Resend Activation Code ---
exports.resendActivationCode = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) return res.status(400).json({ message: 'Admin not found' });
    if (admin.isVerified) return res.status(400).json({ message: 'Account already verified' });

    // Generate new 6-digit Activation Code
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    admin.activationCode = activationCode;
    admin.activationCodeExpires = activationCodeExpires;
    await admin.save();

    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px;">
          <h2 style="color: #14532d;">New Activation Code</h2>
          <p>Your new activation code is:</p>
          <h1 style="color: #eab308; letter-spacing: 5px;">${activationCode}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      </div>
    `;

    await sendEmail(email, 'Resend: Admin Activation Code', emailTemplate);

    res.json({ success: true, message: 'Activation code resent to your email.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Reset Password (Final Step) ---
exports.resetPassword = async (req, res) => {
  try {
    // Hash the token from the URL to match the database
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password (pre-save hook will hash it)
    admin.password = req.body.password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;

    await admin.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};