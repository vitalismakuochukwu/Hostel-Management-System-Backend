const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// IMPORT the helper we built
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new user
const registerUser = async (req, res) => {
  const { fullname, regnumber, department, sex, email, password } = req.body;

  try {
    if (!fullname || !regnumber || !department || !sex || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let user = await User.findOne({ $or: [{ email }, { regnumber }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    user = new User({
      fullname, regnumber, department, sex, email,
      password: hashedPassword,
      isVerified: false,
      verificationToken
    });

    await user.save();

    const verificationUrl = `https://futo-hostels-frontend.onrender.com/verify-email/${verificationToken}`;

    // USE THE HELPER INSTEAD OF TRANSPORTER
    try {
      await sendEmail({
        to: email,
        subject: 'FUTO Hostels - Verify Your Email',
        text: `Hello ${fullname},\n\nYour verification code is: ${verificationToken}\n\nLink: ${verificationUrl}`,
        html: `<h1>Verify Email</h1><p>Your code: <strong>${verificationToken}</strong></p>`
      });
    } catch (emailError) {
      console.error('Email failed but user was saved:', emailError);
    }

    res.status(201).json({ message: 'Registration successful! Check your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ... keep loginUser, verifyEmail, activateAccount as they are ...

// @desc    Resend Verification Code
const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = verificationToken;
    await user.save();

    await sendEmail({
      to: email,
      subject: 'FUTO Hostels - New Code',
      text: `Your new verification code is: ${verificationToken}`
    });

    res.status(200).json({ message: 'Code resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      text: `Your reset code is: ${resetToken}`
    });

    res.status(200).json({ success: true, message: 'Reset code sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// (Keep resetPassword, getUserProfile, updateUserProfile exactly as you had them)

module.exports = { registerUser, loginUser, verifyEmail, activateAccount, getUserProfile, updateUserProfile, resendCode, forgotPassword, resetPassword };