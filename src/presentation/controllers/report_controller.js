const chartGenerator = require('../../analytics_reports/chart_generator');

exports.getMonthlyReport = async (req, res) => {
    try {
        const chartData = await chartGenerator.generateCategoryChartData();
        res.status(200).json({
            success: true,
            data: chartData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo', error: error.message });
    }
};