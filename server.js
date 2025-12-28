const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const seedDatabase = require('./utils/seeder');
const Admin = require('./models/Admin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));
app.use(express.json());

// Database Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hostel_db', {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s to fail faster for retry
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedDatabase();

    // --- Seed Default Admin ---
    // Check if any admin exists to avoid overwriting changes made by the user
    const adminCount = await Admin.countDocuments();

    if (adminCount === 0) {
      const defaultEmail = 'admin@gmail.com';
      const defaultPassword = 'admin123';
      const admin = new Admin({ name: 'Super Admin', email: defaultEmail, password: defaultPassword });
      await admin.save();
      console.log(`\n[Admin Setup] No admins found. Default Admin Created -> Email: ${defaultEmail}, Password: ${defaultPassword}\n`);
    } else {
      console.log(`\n[Admin Setup] Admin accounts detected. Skipping default seed to preserve credentials.\n`);
    }
    // --------------------------

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Check your internet connection, DNS settings, or MongoDB Atlas IP Whitelist.');
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use('/api/admin/auth', require('./routes/authRoutes'));
app.use('/api/auth', require('./routes/studentAuthRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin/reset', require('./routes/adminResetRoutes'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));