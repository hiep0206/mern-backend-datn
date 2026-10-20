const nodemailer = require('nodemailer');

/**
 * Đọc và kiểm tra cấu hình SMTP.
 * Không lưu thông tin đăng nhập trực tiếp trong code.
 */
function getSmtpConfig() {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpAppPassword = process.env.SMTP_APP_PASSWORD?.trim();

  if (!smtpUser || !smtpAppPassword) {
    const error = new Error(
      'Chức năng khôi phục mật khẩu chưa được cấu hình SMTP.'
    );

    error.statusCode = 503;
    throw error;
  }

  return {
    smtpUser,
    smtpAppPassword
  };
}

/**
 * Kiểm tra SMTP trước khi controller tạo và lưu OTP.
 */
function assertConfigured() {
  getSmtpConfig();
}

/**
 * Chuyển ký tự đặc biệt thành HTML entity để tránh chèn HTML
 * ngoài ý muốn vào nội dung email.
 */
function escapeHtml(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return String(value ?? '').replace(
    /[&<>"']/g,
    character => entities[character]
  );
}

/**
 * Gửi mã OTP khôi phục mật khẩu.
 */
async function sendPasswordResetOtp({ to, username, otp }) {
  if (!to || !otp) {
    const error = new Error(
      'Thiếu email người nhận hoặc mã OTP.'
    );

    error.statusCode = 400;
    throw error;
  }

  const { smtpUser, smtpAppPassword } = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpAppPassword
    }
  });

  const mailOptions = {
    from: `"Moneo" <${smtpUser}>`,
    to,
    subject: 'Mã xác nhận khôi phục mật khẩu',
    html: `
      <h3>Xin chào ${escapeHtml(username || 'bạn')},</h3>
      <p>
        Bạn đã yêu cầu khôi phục mật khẩu.
        Dưới đây là mã xác nhận OTP của bạn:
      </p>
      <h2 style="color: #3498db; letter-spacing: 5px;">
        ${escapeHtml(otp)}
      </h2>
      <p>
        Mã này sẽ hết hạn trong vòng 10 phút.
        Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
      </p>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  assertConfigured,
  sendPasswordResetOtp
};