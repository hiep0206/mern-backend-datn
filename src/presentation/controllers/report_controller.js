const chartGenerator = require('../../analytics_reports/chart_generator');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function currentVietnamMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === 'year').value),
    month: Number(parts.find((part) => part.type === 'month').value)
  };
}

function getMonthRange(year, month) {
  // Store and query calendar dates in UTC boundaries corresponding to Vietnam
  // local month start/end (UTC+7).
  const offsetMs = 7 * 60 * 60 * 1000;
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1) - offsetMs),
    endDate: new Date(Date.UTC(year, month, 1) - offsetMs)
  };
}

exports.getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Cần đăng nhập để xem báo cáo.'
      });
    }

    const current = currentVietnamMonth();
    const month = req.query.month === undefined
      ? current.month
      : Number(req.query.month);
    const year = req.query.year === undefined
      ? current.year
      : Number(req.query.year);

    if (
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 1970 || year > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tháng hoặc năm báo cáo không hợp lệ.'
      });
    }

    const { startDate, endDate } = getMonthRange(year, month);
    const chartData = await chartGenerator.generateCategoryChartData({
      userId,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      period: { month, year, timeZone: TIME_ZONE },
      data: chartData
    });
  } catch (error) {
    console.error('[Reports] Lỗi lấy báo cáo:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi lấy báo cáo.'
    });
  }
};
