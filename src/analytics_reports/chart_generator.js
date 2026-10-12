const Transaction = require('../domain/models/Transaction');

exports.generateCategoryChartData = async () => {
    try {
        // Gom nhóm tất cả khoản chi tiêu có sẵn trong database mà không bị ràng buộc ngày tháng
        const expenseStats = await Transaction.aggregate([
            { $match: { type: 'expense' } },
            { $group: { _id: '$category', totalAmount: { $sum: '$amount' } } },
            { $sort: { totalAmount: -1 } }
        ]);

        return { expenseStats };
    } catch (error) {
        throw new Error('Lỗi tổng hợp dữ liệu biểu đồ: ' + error.message);
    }
};