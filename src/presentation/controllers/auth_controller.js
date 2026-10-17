const User = require('../../domain/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// 1. ĐĂNG KÝ
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Mật khẩu không đạt yêu cầu bảo mật!' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'Email này đã được sử dụng!' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// 2. ĐĂNG NHẬP
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'datn_finance_secret_key_2026', 
            { expiresIn: '365d' } // Đã tăng hạn mức lên 1 năm
        );

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            token: token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// 3. YÊU CẦU QUÊN MẬT KHẨU (Gửi OTP)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Email chưa được đăng ký trong hệ thống!' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetPasswordOtp = otp;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // ĐÃ THAY THẾ HOÀN CHỈNH Ở ĐÂY
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'conghiepkrb@gmail.com',
                pass: 'iohr rrds tmfm pazb' // <-- BẠN CHỈ CẦN XÓA DÒNG CHỮ NÀY VÀ DÁN MÃ VÀO
            }
        });

        const mailOptions = {
            from: '"Trợ lý Tài chính AI" <no-reply@financeapp.com>',
            to: user.email,
            subject: 'Mã xác nhận khôi phục mật khẩu',
            html: `<h3>Xin chào ${user.username},</h3>
                   <p>Bạn đã yêu cầu khôi phục mật khẩu. Dưới đây là mã xác nhận (OTP) của bạn:</p>
                   <h2 style="color: #3498db; letter-spacing: 5px;">${otp}</h2>
                   <p>Mã này sẽ hết hạn trong vòng 10 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Mã xác nhận đã được gửi đến email của bạn!' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi gửi email', error: error.message });
    }
};

// 4. XÁC NHẬN OTP VÀ ĐẶT LẠI MẬT KHẨU
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ 
            email, 
            resetPasswordOtp: otp,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn!' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// 5. CHỦ ĐỘNG ĐỔI MẬT KHẨU (Khi đang đăng nhập)
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không chính xác!' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};