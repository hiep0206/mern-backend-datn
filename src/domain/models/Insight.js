const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  monthYear: String,
  summaryData: Array,
  aiResponse: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Insight', insightSchema);