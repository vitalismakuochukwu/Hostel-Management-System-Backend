const Admin = require('../models/Admin');
const Room = require('../models/Room');

const seedDatabase = async () => {
  try {
    // Seed Default Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({ 
        email: 'Admin@gmail.com', 
        password: 'admin@123', 
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