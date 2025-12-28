const Room = require('../models/Room');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private (Admin)
const createRoom = async (req, res) => {

  const { name, type, gender, price, capacity, availableBunks, description, image, hostel } = req.body;

  if (!name || !type || !gender || !price || !capacity || availableBunks === undefined) {
    return res.status(400).json({ message: 'Please fill in all required fields' });
  }

  try {
    const room = new Room({
      name,
      hostel,
      type,
      gender,
      price,
      capacity,
      availableBunks,
      description,
      image
    });

    const createdRoom = await room.save();
    res.status(201).json(createdRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
  try {
    const { gender } = req.query;
    let query = {};

    if (gender) {

      query.gender = gender;
    }
    const rooms = await Room.find(query).sort({ _id: -1 });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get available rooms
// @route   GET /api/rooms/available
// @access  Public
const getAvailableRooms = async (req, res) => {
  try {
    const { gender } = req.query;

    let query = { availableBunks: { $gt: 0 } };

    if (gender) {
      query.gender = gender;
    }
    const rooms = await Room.find(query);
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room) {
      res.json(room);
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id

// @access  Private (Admin)

const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room) {
      room.name = req.body.name || room.name;
      room.hostel = req.body.hostel || room.hostel;
      room.type = req.body.type || room.type;
      room.gender = req.body.gender || room.gender;
      room.price = req.body.price !== undefined ? req.body.price : room.price;
      room.capacity = req.body.capacity !== undefined ? req.body.capacity : room.capacity;
      room.availableBunks = req.body.availableBunks !== undefined ? req.body.availableBunks : room.availableBunks;
      room.description = req.body.description || room.description;
      room.image = req.body.image || room.image;

      const updatedRoom = await room.save();
      res.json(updatedRoom);
    } else {
      res.status(404).json({ message: 'Room not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};



module.exports = { createRoom, getRooms, getRoomById, updateRoom, getAvailableRooms };