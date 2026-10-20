const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Đã sửa thành MONGODB_URI để khớp hoàn toàn với file .env của bạn
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(` Lỗi kết nối Database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;