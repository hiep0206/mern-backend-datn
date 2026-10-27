const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordOtp: {
        type: String
    },
    resetPasswordExpire: {
        type: Date
    },
    isBiometricEnabled: {
        type: Boolean,
        default: false
    },
    // Bổ sung trường lưu trữ Hạn mức ngân sách
    monthlyBudget: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);