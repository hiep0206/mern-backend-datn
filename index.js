require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// 1. IMPORT THÊM THƯ VIỆN GEMINI AI
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import Models (Lưu ý thư mục tên là "models" chứ không phải "modules")
const Transaction = require('./modules/Transaction');
const Insight = require('./modules/Insight');

const app = express();

// Middleware xử lý request
app.use(cors());
app.use(express.json());

// Kết nối đến Database trên Cloud
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' Đã kết nối MongoDB Atlas thành công!'))
  .catch((err) => console.error('Lỗi kết nối MongoDB:', err));

// 2. KHỞI TẠO GEMINI AI VỚI KEY TỪ .ENV
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Route kiểm tra sức khỏe của API
app.get('/', (req, res) => {
  res.send('API App Quản lý Tài chính đang chạy mượt mà!');
});

// API: Lấy danh sách giao dịch (Đã gộp phần bị lặp)
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Lỗi khi lấy giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API: Xóa giao dịch theo ID
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransaction = await Transaction.findByIdAndDelete(id);
    
    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch để xóa!' });
    }
    
    res.status(200).json({ message: '✅ Đã xóa giao dịch thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa', error: error.message });
  }
});

// API: Tạo giao dịch mới
app.post('/api/transactions', async (req, res) => {
  try {
    const { amount, type, category, note, date, userId } = req.body;
    if (!amount || !type || !category) {
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc: amount, type, category' });
    }
    const newTransaction = new Transaction({
      userId: userId || 'user_123',
      amount, type, category, note,
      date: date || new Date()
    });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error('Lỗi khi tạo giao dịch:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API: Thống kê tổng chi tiêu theo từng danh mục
app.get('/api/transactions/summary', async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: '$category', totalAmount: { $sum: '$amount' } } },
      { $sort: { totalAmount: -1 } }
    ]);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thống kê', error: error.message });
  }
});

// 3. API QUAN TRỌNG: SINH LỜI KHUYÊN TỪ GEMINI AI (Đường dẫn mà Postman báo lỗi 404)
app.post('/api/insights/generate', async (req, res) => {
  try {
    // Kéo dữ liệu thống kê từ DB
    const summary = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: '$category', totalAmount: { $sum: '$amount' } } }
    ]);

    if (summary.length === 0) {
      return res.status(400).json({ message: 'Chưa có dữ liệu chi tiêu để phân tích.' });
    }

    // Ghép dữ liệu thành đoạn văn bản mớm cho AI
    let spendingsText = summary.map(item => `- ${item._id}: ${item.totalAmount} VNĐ`).join('\n');
    const prompt = `Bạn là một chuyên gia tài chính cá nhân. Dưới đây là thống kê chi tiêu của tôi:
${spendingsText}
Hãy phân tích ngắn gọn thói quen chi tiêu này và đưa ra 3 lời khuyên thiết thực nhất để tôi tiết kiệm tiền. Trả lời bằng tiếng Việt.`;

    // Gọi AI
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // Lưu vào MongoDB
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    const newInsight = new Insight({
      monthYear: currentMonthYear,
      summaryData: summary,
      aiResponse: aiResponse
    });
    await newInsight.save();

    res.status(200).json({ message: 'Đã phân tích thành công', insight: newInsight });
  } catch (error) {
    console.error('Lỗi AI:', error);
    res.status(500).json({ message: 'Lỗi sinh lời khuyên AI', error: error.message });
  }
});

// Khởi chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server đang chạy tại http://localhost:${PORT}`);
});