const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

// @desc    Book a room
// @route   POST /api/bookings
// @access  Private
const bookRoom = async (req, res) => {

  const { roomId, userId, bunkNumber, amount } = req.body;

  console.log("Data received from frontend:", req.body); // ADD THIS LINE TO DEBUG

  if (!roomId || !userId || !bunkNumber) {
    return res.status(400).json({ message: 'Please provide room, user, and bunk number' });
  }

  try {
    // 1. Check if room exists
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // 2. Check availability
    if (room.availableBunks <= 0) {
      return res.status(400).json({ message: 'Room is fully booked' });
    }

    // 3. Check if specific bunk is taken
    const activeBooking = await Booking.findOne({ 
      
        room: roomId, 
        bunkNumber, 
        $or: [{ status: 'Confirmed' }, { status: 'Reserved', expiresAt: { $gt: Date.now() } }] 
      
    });

    if (activeBooking) {

      return res.status(400).json({ message: `Bunk ${bunkNumber} is already occupied` });
    }

    // 4. Check if user already has a booking (Optional logic)
    const existingBooking = await Booking.findOne({ user: userId, status: { $in: ['Pending', 'Confirmed'] } });
    if (existingBooking) {
      return res.status(400).json({ message: 'You already have an active booking' });
    }


    // 5. Generate RRR and Expiry (48 hours)
    const rrr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 6. Create Booking
    const booking = new Booking({
      user: userId,
      room: roomId,
      bunkNumber,
      amount: amount || room.price,
      status: 'Reserved',
      paymentStatus: 'Pending',
      rrr,

      expiresAt
    });
    await booking.save();

    // 7. Decrement available bunks
    room.availableBunks -= 1;
    await room.save();

    // 8. Update User Profile with Room Info
    await User.findByIdAndUpdate(userId, {
      room: room.name,
      hostel: room.hostel
    });

    // Explicitly return the booking with RRR
    res.status(201).json({ success: true, message: 'Room reserved successfully. Proceed to payment.', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get bookings for a specific room (to show occupied/reserved bunks)
// @route   GET /api/bookings/room/:roomId

// @access  Public

const getRoomBookings = async (req, res) => {
  try {
    const { roomId } = req.params;
    // Find bookings that are Confirmed OR Reserved and NOT expired
    const bookings = await Booking.find({
      room: roomId,
      $or: [
        { status: 'Confirmed' },
        { status: 'Reserved', expiresAt: { $gt: Date.now() } }
      ]
    }).select('bunkNumber status expiresAt');

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings/mybookings/:userId

// @access  Private

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate('room')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Verify Payment
// @route   POST /api/bookings/verify

// @access  Private
const verifyPayment = async (req, res) => {
  const { bookingId, reference } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.paymentStatus = 'Paid';
    booking.status = 'Confirmed';
    await booking.save();

    res.json({ message: 'Payment verified and booking confirmed', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
// @access  Private (Admin)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'fullname regnumber email')
      .populate('room', 'name type')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  bookRoom,
  getUserBookings,
  verifyPayment,
  getRoomBookings,
  getAllBookings
};