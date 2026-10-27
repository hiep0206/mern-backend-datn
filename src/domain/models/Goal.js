const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true, min: 0 },
    deadline: { type: Date },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);