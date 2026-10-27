const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Tự động nhận diện cả MONGO_URI và MONGODB_URI để chống lỗi undefined trên Render
    const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!dbUri) {
        throw new Error("Không tìm thấy chuỗi kết nối Database trong biến môi trường!");
    }

    const conn = await mongoose.connect(dbUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Lỗi kết nối Database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;