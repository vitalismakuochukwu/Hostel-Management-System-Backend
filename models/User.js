const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  regnumber: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  sex: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  hostel: { type: String },
  room: { type: String },
  status: { type: String, default: 'Active' }
});

module.exports = mongoose.model('User', UserSchema);