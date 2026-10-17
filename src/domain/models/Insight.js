const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  monthYear: String,
  summaryData: Array,
  aiResponse: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Insight', insightSchema);