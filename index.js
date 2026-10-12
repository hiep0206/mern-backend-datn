require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Khai báo controller báo cáo thống kê cho biểu đồ
const reportController = require('./src/presentation/controllers/report_controller');

const app = express();
app.use(cors());

// MỞ RỘNG GIỚI HẠN LÊN 50MB ĐỂ CHUYỂN ĐƯỢC DỮ LIỆU LỚN
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Kết nối DB
connectDB();

app.get('/', (req, res) => {
  res.send('API App Quản lý Tài chính đã chuyển đổi hoàn toàn sang kiến trúc mới!');
});

// Định tuyến API (Ngắn gọn, sạch sẽ)
app.use('/api/transactions', require('./src/presentation/routes/transaction_routes'));
app.use('/api/insights', require('./src/presentation/routes/ai_routes'));
app.use('/api/borrows', require('./src/presentation/routes/borrow_routes')); // API Sổ theo dõi mượn trả

// Thêm đường dẫn API lấy dữ liệu biểu đồ thống kê cho Frontend
app.get('/api/v1/reports/monthly', reportController.getMonthlyReport);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
app.use('/api/auth', require('./src/presentation/routes/auth_routes'));