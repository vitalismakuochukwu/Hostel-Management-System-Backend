const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { fullname, regnumber, department, sex, email, password } = req.body;

  try {
    if (!fullname || !regnumber || !department || !sex || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { regnumber }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email or reg number' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate Verification Token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    user = new User({
      fullname,
      regnumber,
      department,
      sex,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken
    });

    await user.save();

    // Construct Verification URL (Pointing to Frontend)
    const verificationUrl = `http://localhost:5173/verify-email/${verificationToken}`;

    // Send Confirmation Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FUTO Hostels - Verify Your Email',
      text: `Hello ${fullname},\n\nThank you for registering. Your verification code is: ${verificationToken}\n\nPlease click the link below to verify your email and activate your account:\n\n${verificationUrl}\n\nBest Regards,\nFUTO Hostels Team`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account. If you cannot find the email in your inbox or spam folder, please contact the admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Check if user is verified
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email before logging in.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '10m' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        fullname: user.fullname, 
        email: user.email, 
        regnumber: user.regnumber,
        department: user.department,
        sex: user.sex,
        // Ensure these values are included, even if null
        hostel: user.hostel,
       // Ensure these values are included, even if null
        room: user.room,
        status: user.status
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify User Email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    await user.save();

    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Activate Account (Manual Code)
// @route   POST /api/activate
// @access  Public
const activateAccount = async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findOne({ verificationToken: code });
    if (!user) return res.status(400).json({ message: 'Invalid or expired activation code' });

    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    await user.save();

    res.status(200).json({ message: 'Account activated successfully! You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get User Profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });

    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @desc    Update User Profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    let token = req.header('Authorization');
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trim();
    }

    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fullname = req.body.fullname || user.fullname;
    user.department = req.body.department || user.department;
    user.sex = req.body.sex || user.sex;
    
    const updatedUser = await user.save();

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Resend Verification Code
// @route   POST /api/resend-code
// @access  Public
const resendCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    // Generate Verification Token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = verificationToken;
    await user.save();

    // Send Confirmation Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FUTO Hostels - Resend Verification Code',
      text: `Hello ${user.fullname},\n\nYou requested a new verification code. Your code is: ${verificationToken}\n\nBest Regards,\nFUTO Hostels Team`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate Reset Token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Your reset code is: ${resetToken}`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Reset code sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser, verifyEmail, activateAccount, getUserProfile, updateUserProfile, resendCode, forgotPassword, resetPassword };