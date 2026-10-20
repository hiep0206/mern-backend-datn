require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { PORT, CORS_ORIGINS } = require('./config/app_config');
const connectDB = require('./src/infrastructure/database/connection');

const app = express();

// Cấu hình CORS tập trung tại config/app_config.js
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cấu hình nhận dữ liệu từ request
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true
}));

// Kết nối MongoDB
connectDB();

// API kiểm tra trạng thái server
app.get('/', (req, res) => {
  res.send(
    'API App Quản lý Tài chính đã chuyển đổi hoàn toàn sang kiến trúc mới!'
  );
});

// Các API của ứng dụng
app.use(
  '/api/auth',
  require('./src/presentation/routes/auth_routes')
);

app.use(
  '/api/transactions',
  require('./src/presentation/routes/transaction_routes')
);

app.use(
  '/api/insights',
  require('./src/presentation/routes/ai_routes')
);

app.use(
  '/api/borrows',
  require('./src/presentation/routes/borrow_routes')
);

// Nhóm API phiên bản v1, bao gồm báo cáo thống kê tháng
app.use(
  '/api/v1',
  require('./src/presentation/routes/api_v1')
);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});