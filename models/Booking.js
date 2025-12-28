const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  bunkNumber: {
    type: Number,
    required: [true, "Please provide the bunk number"]
  },
  status: { type: String, enum: ['Pending', 'Reserved', 'Confirmed', 'Cancelled'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  amount: { type: Number, required: true },
  rrr: { type: String },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);