const User = require('../../domain/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt } = require('crypto');

const {
  getJwtSecret
} = require('../../core/security/security_config');

const emailService = require('../../infrastructure/notifications/email_service');

function isStrongPassword(password) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return typeof password === 'string' && passwordRegex.test(password);
}

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên, email và mật khẩu.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    return res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công!' });
  } catch (error) {
    console.error('[Auth] Lỗi đăng ký:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký tài khoản.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác!' });
    }

    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '365d' });

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        monthlyBudget: user.monthlyBudget // Trả về ngân sách đã lưu
      }
    });
  } catch (error) {
    console.error('[Auth] Lỗi đăng nhập:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập.' });
  }
};

exports.forgotPassword = async (req, res) => {
  let user;
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });

    user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'Email chưa được đăng ký trong hệ thống!' });

    emailService.assertConfigured();
    const otp = randomInt(100000, 1000000).toString();

    user.resetPasswordOtp = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await emailService.sendPasswordResetOtp({ to: user.email, username: user.username, otp });
    } catch (sendError) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      throw sendError;
    }

    return res.status(200).json({ success: true, message: 'Mã xác nhận đã được gửi đến email của bạn!' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 503 ? 'Chức năng khôi phục mật khẩu chưa được cấu hình SMTP.' : statusCode < 500 ? error.message : 'Lỗi gửi email. Vui lòng thử lại sau.'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Vui lòng nhập email, mã OTP và mật khẩu mới.' });
    if (!isStrongPassword(newPassword)) return res.status(400).json({ success: false, message: 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.' });

    const user = await User.findOne({ email, resetPasswordOtp: String(otp), resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn!' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) return res.status(401).json({ success: false, message: 'Không xác định được tài khoản đăng nhập.' });
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới.' });
    if (!isStrongPassword(newPassword)) return res.status(400).json({ success: false, message: 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác!' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu.' });
  }
};

// API LƯU NGÂN SÁCH
exports.updateBudget = async (req, res) => {
  try {
      const userId = req.user?.id || req.user?._id || req.user?.userId;
      const user = await User.findByIdAndUpdate(
          userId,
          { monthlyBudget: req.body.budget },
          { new: true }
      );
      res.status(200).json({ budget: user.monthlyBudget });
  } catch (error) {
      res.status(500).json({ message: 'Lỗi cập nhật ngân sách', error: error.message });
  }
};