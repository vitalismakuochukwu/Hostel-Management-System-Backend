const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hostel: { type: String, required: true },
  type: { type: String, required: true },
  gender: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  availableBunks: { type: Number, required: true },
  description: { type: String },
  image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);