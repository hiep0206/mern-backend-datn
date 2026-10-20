function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET chưa được cấu hình hoặc ngắn hơn 32 ký tự.'
    );
  }

  return secret;
}

module.exports = { getJwtSecret };