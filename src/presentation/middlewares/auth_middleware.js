const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../../config/security');

module.exports = (req, res, next) => {
  const authorization = req.header('Authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Từ chối truy cập! Vui lòng đăng nhập.'
    });
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch (error) {
    console.error('[Security] JWT_SECRET chưa được cấu hình an toàn.');
    return res.status(500).json({
      success: false,
      message: 'Máy chủ chưa được cấu hình khóa xác thực an toàn.'
    });
  }

  try {
    const decoded = jwt.verify(authorization.slice(7).trim(), secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn!'
    });
  }
};
