const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema({
  // Không bắt buộc required: true để tránh lỗi với các dữ liệu cũ đã lưu trước đó
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  type: { type: String, enum: ['lend', 'borrow'], required: true }, 
  category: { type: String, enum: ['money', 'item'], required: true, default: 'money' }, 
  partner: { type: String, required: true },
  
  amount: { type: Number }, 
  itemName: { type: String }, 
  amountOrItem: { type: String }, 

  interestRate: { type: Number, default: 0 },
  interestType: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' }, 
  amountPaid: { type: Number, default: 0 },

  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  status: { type: String, enum: ['open', 'upcoming', 'due_today', 'overdue', 'settled'], default: 'open' },
  
  notes: { type: String },
  proofImage: { type: String },

  // LƯU LỊCH SỬ THANH TOÁN
  paymentHistory: [{
    amount: { type: Number },
    date: { type: Date, default: Date.now },
    note: { type: String }
  }]
});

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema);