const Admin = require('../models/Admin');
const Room = require('../models/Room');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    // Seed Default Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin@123', salt);
      await Admin.create({ 
        email: 'Admin@gmail.com', 
        password: hashedPassword, 
        name: 'Admin User',
        role: 'Super Admin'
      });
      console.log('Default Admin Account Created');
    }

  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedDatabase;