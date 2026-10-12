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
    // Chuẩn bị cho tính năng Nhóm IV.2 (Xác thực sinh trắc học) sau này
    isBiometricEnabled: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);