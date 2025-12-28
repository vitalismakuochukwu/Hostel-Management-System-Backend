const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const User = require('../models/User');

router.get('/stats', async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ availableBunks: { $gt: 0 } });
    const totalBookings = await Booking.countDocuments();
    
    // Count students (assuming 'role' field exists, otherwise counts all users)
    const totalStudents = await User.countDocuments({ role: 'student' });

    res.json({
      totalRooms,
      availableRooms,
      totalBookings,
      totalStudents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;