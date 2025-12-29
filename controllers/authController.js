const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new user
const registerUser = async (req, res) => {
  const { fullname, regnumber, department, sex, email, password } = req.body;
  try {
    if (!fullname || !regnumber || !department || !sex || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    let user = await User.findOne({ $or: [{ email }, { regnumber }] });
    if (user) return res.status(400).json({ message: 'User already exists' });

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

    try {
      await sendEmail({
        to: email,
        subject: 'FUTO Hostels - Verify Your Email',
        text: `Your code is: ${verificationToken}`,
        html: `<strong>${verificationToken}</strong>`
      });
    } catch (err) { console.error('Email error:', err); }

    res.status(201).json({ message: 'Registration successful! Check email.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!user.isVerified) return res.status(400).json({ message: 'Verify email first' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, user });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(400).json({ message: 'Invalid token' });
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.json({ message: 'Email verified!' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

const activateAccount = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.body.code });
    if (!user) return res.status(400).json({ message: 'Invalid code' });
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.json({ message: 'Activated!' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

const getUserProfile = async (req, res) => {
  try {
    // 1. Get the token from headers
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 2. Verify token and find user
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Send the user data back
    res.json(user);
  } catch (error) {
    console.error("Profile Error:", error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (user) {
      user.fullname = req.body.fullname || user.fullname;
      user.department = req.body.department || user.department;
      const updated = await user.save();
      res.json(updated);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const changePassword = async (req, res) => {
  try {
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'All fields required' });

    if (await bcrypt.compare(oldPassword, user.password)) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      res.json({ message: 'Password updated' });
    } else {
      res.status(400).json({ message: 'Invalid old password' });
    }
  } catch (error) {
    console.error("Change Password Error:", error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = token;
    await user.save();
    await sendEmail({ to: email, subject: 'New Code', text: `Code: ${token}` });
    res.json({ message: 'Code resent' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 600000;
    await user.save();
    await sendEmail({ to: email, subject: 'Reset Code', text: `Code: ${token}` });
    res.json({ message: 'Reset code sent' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({ email, resetPasswordToken: code, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid code' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
};

module.exports = { registerUser, loginUser, verifyEmail, activateAccount, getUserProfile, updateUserProfile, changePassword, resendCode, forgotPassword, resetPassword };