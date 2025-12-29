// const Admin = require('../models/Admin');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');

// // @desc    Register Admin
// // @route   POST /api/admin/auth/register
// // @access  Public
// const registerAdmin = async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     const adminExists = await Admin.findOne({ email });
//     if (adminExists) {
//       return res.status(400).json({ success: false, message: 'User already exists' });
//     }
//     const admin = await Admin.create({ name, email, password });
//     res.status(201).json({ success: true, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // @desc    Login Admin
// // @route   POST /api/admin/auth/login
// // @access  Public
// const loginAdmin = async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const admin = await Admin.findOne({ email, password });
//     if (admin) {
//       res.json({ success: true, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
//     } else {
//       res.status(401).json({ success: false, message: 'Invalid credentials' });
//     }
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // @desc    Update Admin Profile
// // @route   PUT /api/admin/auth/profile
// // @access  Private
// const updateProfile = async (req, res) => {
//   const { email, name, currentEmail } = req.body;
//   try {
//     const admin = await Admin.findOneAndUpdate({ email: currentEmail }, { name, email }, { new: true });
//     res.json(admin);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };

// // @desc    Update Admin Password
// // @route   PUT /api/admin/auth/password
// // @access  Private
// const updatePassword = async (req, res) => {
//   const { email, currentPassword, newPassword } = req.body;
//   try {
//     const admin = await Admin.findOne({ email, password: currentPassword });
//     if (admin) {
//       admin.password = newPassword;
//       await admin.save();
//       res.json({ success: true });
//     } else {
//       res.status(400).json({ success: false, message: 'Incorrect current password' });
//     }
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // @desc    Forgot Password
// // @route   POST /api/admin/auth/forgotpassword
// // @access  Public
// const forgotPassword = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return res.status(404).json({ success: false, message: 'Email not found' });
//     }

//     // Generate Reset Token
//     const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

//     // Hash token and save to database
//     admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//     admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

//     await admin.save();

//     const message = `You have requested a password reset. Your reset code is: ${resetToken}`;

//     const transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT,
//       secure: true,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//       }
//     });

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Password Reset Request',
//       text: message
//     });

//     res.status(200).json({ success: true, data: 'Email sent' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Email could not be sent' });
//   }
// };

// // @desc    Resend Code
// // @route   POST /api/admin/auth/resend-code
// // @access  Public
// const resendCode = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return res.status(404).json({ success: false, message: 'Email not found' });
//     }

//     // Generate Reset Token
//     const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

//     // Hash token and save to database
//     admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//     admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

//     await admin.save();

//     const message = `You have requested to resend your code. Your code is: ${resetToken}`;

//     const transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_HOST,
//       port: process.env.EMAIL_PORT,
//       secure: true,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//       }
//     });

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Resend Code Request',
//       text: message
//     });

//     res.status(200).json({ success: true, data: 'Code resent successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: 'Email could not be sent' });
//   }
// };

// module.exports = {
//   registerAdmin,
//   loginAdmin,
//   updateProfile,
//   updatePassword,
//   forgotPassword,
//   resendCode
// };

const Admin = require('../models/Admin');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcryptjs');

// Initialize SendGrid with your API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// @desc    Register Admin
const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const admin = await Admin.create({ name, email, password: hashedPassword });
    res.status(201).json({ success: true, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Find admin by email only
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2. Compare the typed password with the hashed password in DB
    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch) {
      // 3. Login successful
      res.json({ 
        success: true, 
        admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } 
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update Admin Profile
const updateProfile = async (req, res) => {
  const { email, name, currentEmail } = req.body;
  try {
    const admin = await Admin.findOneAndUpdate({ email: currentEmail }, { name, email }, { new: true });
    res.json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Update Admin Password
const updatePassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    const admin = await Admin.findOne({ email, password: currentPassword });
    if (admin) {
      admin.password = newPassword;
      await admin.save();
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Forgot Password (UPDATED WITH SENDGRID)
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // 1. Create Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Save Hashed Token to DB
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
    await admin.save();

    // 3. Create the Reset URL (REPLACE with your real Frontend URL)
    const frontendUrl = "https://futo-hostels-frontend.onrender.com"; 
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // 4. SendGrid Message Object
    const msg = {
      to: admin.email,
      from: process.env.EMAIL_FROM, // Must be vitalismakuo@gmail.com
      subject: 'Admin Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>Password Reset Request</h2>
          <p>You are receiving this because you (or someone else) requested a password reset for your admin account.</p>
          <p>Please click on the button below to complete the process:</p>
          <a href="${resetUrl}" style="background: #1a5c2a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p>If you did not request this, please ignore this email.</p>
          <hr />
          <p>This link will expire in 10 minutes.</p>
        </div>
      `,
    };

    // 5. THE ACTUAL SEND COMMAND (This replaces the console.log)
    await sgMail.send(msg);

    res.status(200).json({ success: true, data: 'Email sent successfully' });
  } catch (err) {
    console.error("SendGrid Error:", err.response ? err.response.body : err);
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// @desc    Resend Code (UPDATED WITH SENDGRID)
const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await admin.save();

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM,
      subject: 'Resend Code Request',
      text: `Your requested code has been resent. Your code is: ${resetToken}`,
      html: `<strong>Your requested code has been resent. Your code is: ${resetToken}</strong>`,
    };

    await sgMail.send(msg);
    res.status(200).json({ success: true, data: 'Code resent successfully' });
  } catch (err) {
    console.error("SendGrid Admin Resend Error:", err.response ? err.response.body : err);
    res.status(500).json({ success: false, message: 'Email could not be sent' });
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