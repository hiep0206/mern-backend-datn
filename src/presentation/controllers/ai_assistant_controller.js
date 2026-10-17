const virtualAssistant = require('../../ai_engine/virtual_assistant');

exports.generateInsight = async (req, res) => {
  const userId = req.user?.id || req.user?._id || req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: 'Không xác định được tài khoản đăng nhập.'
    });
  }

  try {
    const result = await virtualAssistant.generateInsightForUser(userId);
    return res.status(200).json({
      message: 'Đã phân tích thành công',
      ...result
    });
  } catch (error) {
    console.error('[AI Controller] Không thể tạo insight:', error.message);

    return res.status(error.statusCode || 500).json({
      message: error.publicMessage || 'Không thể tạo lời khuyên AI. Vui lòng thử lại.'
    });
  }
};
