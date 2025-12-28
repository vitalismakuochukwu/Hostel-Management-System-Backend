const express = require('express');
const router = express.Router();
const { bookRoom, getUserBookings, getRoomBookings, verifyPayment, getAllBookings } = require('../controllers/bookingController');

router.post('/', bookRoom);
router.get('/', getAllBookings);
router.get('/room/:roomId', getRoomBookings);
router.get('/mybookings/:userId', getUserBookings);
router.post('/verify', verifyPayment);

module.exports = router;