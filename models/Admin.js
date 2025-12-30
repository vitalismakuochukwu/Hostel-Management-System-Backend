const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  activationCode: String,
  activationCodeExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// Encrypt password using bcrypt
// adminSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// models/Admin.js

// OLD BROKEN WAY: adminSchema.pre('save', async function(next) { ... next() })
// NEW CORRECT WAY:
adminSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return; // Just return, don't call next()
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // No next() call here!
});

module.exports = mongoose.model('Admin', adminSchema);