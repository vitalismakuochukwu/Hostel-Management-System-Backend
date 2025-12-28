// console.log("DEBUG: Your URI is ->", process.env.MONGO_URI);
// const mongoose = require("mongoose");
// const connectDB = async () => {
//   try {
//     const connect = await mongoose.connect(process.env.MONGO_URI);
//     console.log(`MongoDB Connected:${connect.connection.host}`.bgRed);
//   } catch (error) {
//     console.log(error);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // We explicitly log this to see if it's working
    console.log("Attempting to connect with URI:", process.env.MONGO_URI);
    
    const connect = await mongoose.connect(process.env.MONGO_URI);

    // Add .yellow at the end of the string
    console.log(`MongoDB Connected:${connect.connection.host}`.bgRed);
   
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;