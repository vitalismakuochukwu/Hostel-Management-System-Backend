const express = require('express');
const router = express.Router();
const { createRoom, getRooms, getRoomById, updateRoom, getAvailableRooms } = require('../controllers/roomController');

router.route('/').post(createRoom).get(getRooms);
router.get('/available', getAvailableRooms); 
router.route('/:id').get(getRoomById).put(updateRoom);

module.exports = router;