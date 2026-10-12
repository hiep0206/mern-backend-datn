const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Lấy token từ header của request
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ success: false, message: 'Từ chối truy cập! Chưa có token.' });

    try {
        // Giải mã token để lấy ID người dùng
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'datn_finance_secret_key_2026');
        req.user = decoded; // Gắn thông tin user vào request để các hàm sau sử dụng
        next(); // Cho phép đi tiếp
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};