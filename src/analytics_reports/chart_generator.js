const mongoose = require('mongoose');
const Transaction = require('../domain/models/Transaction');

/**
 * Builds category expense data for one authenticated user and one time period.
 * The date range is [startDate, endDate), both derived in the controller using
 * the Asia/Ho_Chi_Minh calendar month.
 */
exports.generateCategoryChartData = async ({ userId, startDate, endDate }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
      const error = new Error('ID tài khoản không hợp lệ.');
      error.statusCode = 401;
      throw error;
    }

    const expenseStats = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(String(userId)),
          type: 'expense',
          date: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Chưa phân loại'] },
          totalAmount: { $sum: { $convert: {
            input: '$amount',
            to: 'double',
            onError: 0,
            onNull: 0
          } } },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalExpense = expenseStats.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    return { expenseStats, totalExpense, currency: 'VND' };
  } catch (error) {
    if (error.statusCode) throw error;
    throw new Error('Lỗi tổng hợp dữ liệu biểu đồ: ' + error.message);
  }
};
