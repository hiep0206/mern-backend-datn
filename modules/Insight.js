const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: 'user_123' },
  monthYear: { type: String, required: true },
  summaryData: { type: Object, required: true },
  aiResponse: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Insight', insightSchema);