const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Transaction = require('../domain/models/Transaction');
const Insight = require('../domain/models/Insight');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CURRENCY = 'VNĐ';

function serviceError(message, statusCode = 500, publicMessage = message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function getCurrentVietnamMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  const year = Number(parts.find(part => part.type === 'year').value);
  const month = Number(parts.find(part => part.type === 'month').value);
  const utcOffset = 7 * 60 * 60 * 1000;

  return {
    year,
    month,
    monthYear: `${year}-${String(month).padStart(2, '0')}`,
    monthLabel: `tháng ${month}/${year}`,
    startDate: new Date(Date.UTC(year, month - 1, 1) - utcOffset),
    endDate: new Date(Date.UTC(year, month, 1) - utcOffset)
  };
}

function formatVND(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} ${CURRENCY}`;
}

function getHttpStatus(error) {
  return Number(
    error.status ||
    error.statusCode ||
    error.response?.status ||
    500
  );
}

/**
 * Generate and persist a user's monthly spending insight.
 * This use case belongs to the AI layer, not the HTTP controller.
 */
async function generateInsightForUser(rawUserId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw serviceError(
      'GEMINI_API_KEY chưa được cấu hình.',
      503,
      'Chưa cấu hình GEMINI_API_KEY để sử dụng tính năng AI.'
    );
  }

  const userIdString = String(rawUserId || '');
  if (!mongoose.Types.ObjectId.isValid(userIdString)) {
    throw serviceError(
      'ID tài khoản không hợp lệ.',
      401,
      'Không xác định được tài khoản đăng nhập.'
    );
  }

  const userId = new mongoose.Types.ObjectId(userIdString);
  const {
    monthYear,
    monthLabel,
    startDate,
    endDate
  } = getCurrentVietnamMonth();

  const matchCondition = {
    userId,
    type: 'expense',
    date: { $gte: startDate, $lt: endDate }
  };

  const expenseCount = await Transaction.countDocuments(matchCondition);
  if (expenseCount === 0) {
    throw serviceError(
      `Không có giao dịch chi tiêu trong ${monthLabel}.`,
      400,
      `Bạn chưa có giao dịch chi tiêu trong ${monthLabel}.`
    );
  }

  const summary = await Transaction.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: { $ifNull: ['$category', 'Chưa phân loại'] },
        totalAmount: {
          $sum: {
            $convert: {
              input: '$amount',
              to: 'double',
              onError: 0,
              onNull: 0
            }
          }
        },
        transactionCount: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  if (summary.length === 0) {
    throw serviceError(
      'Không tổng hợp được giao dịch chi tiêu.',
      400,
      'Không tổng hợp được chi tiêu. Vui lòng kiểm tra dữ liệu giao dịch.'
    );
  }

  const totalExpenses = summary.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const categories = summary.map(item => {
    const amount = Number(item.totalAmount || 0);
    return {
      category: String(item._id || 'Chưa phân loại'),
      totalAmount: amount,
      transactionCount: Number(item.transactionCount || 0),
      percentage: totalExpenses > 0
        ? Number(((amount / totalExpenses) * 100).toFixed(1))
        : 0
    };
  });

  const categoryText = categories.map(item =>
    `- Danh mục: ${item.category}\n` +
    `  Tổng tiền: ${formatVND(item.totalAmount)}\n` +
    `  Tỷ trọng: ${item.percentage}%\n` +
    `  Số giao dịch: ${item.transactionCount}`
  ).join('\n');

  const largestCategory = categories[0];
  const prompt = `
Bạn là trợ lý phân tích tài chính cá nhân.
Hãy viết báo cáo ngắn gọn, dễ hiểu bằng tiếng Việt và sử dụng Markdown.

PHẠM VI DỮ LIỆU
${monthLabel}, tính đến thời điểm phân tích.

SỐ LIỆU ĐÃ ĐƯỢC BACKEND TÍNH TOÁN
Tổng chi tiêu: ${formatVND(totalExpenses)}
Số giao dịch: ${expenseCount}

Danh sách danh mục:
${categoryText}

Danh mục có tổng chi tiêu lớn nhất:
${largestCategory.category}
Tổng tiền: ${formatVND(largestCategory.totalAmount)}
Tỷ trọng: ${largestCategory.percentage}%

YÊU CẦU BÁO CÁO
1. Nêu danh mục chi tiêu lớn nhất, số tiền và tỷ trọng đã cung cấp.
2. Nhận xét tổng chi và tỷ trọng dựa trên số liệu thật. Không đánh giá cao/thấp nếu không có ngân sách, thu nhập hoặc kỳ trước để so sánh.
3. Đưa ra đúng 3 lời khuyên thực tế, gắn với các danh mục thực tế. Không mặc định khoản chi lớn là lãng phí; không bịa số liệu, nguyên nhân hoặc tỷ lệ.
4. Nếu tháng chưa kết thúc, ghi rõ số liệu tính đến thời điểm phân tích, không phải số liệu cả tháng đã kết thúc.
5. Không tự tính lại tổng và tỷ trọng đã được cung cấp.

Trình bày bằng ba tiêu đề rõ ràng, kèm gạch đầu dòng khi phù hợp.
Giữ giọng văn thân thiện, chuyên nghiệp, thực tế.
`;

  let result;
  try {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        const status = getHttpStatus(error);
        const retryable = [429, 500, 502, 503, 504].includes(status);
        if (!retryable || attempt === 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!result) throw new Error('Gemini chưa trả về kết quả.');

    const aiResponse = result.response.text();
    if (!aiResponse || !aiResponse.trim()) {
      throw new Error('Gemini trả về nội dung rỗng.');
    }

    const savedSummary = summary.map(item => ({
      _id: item._id,
      totalAmount: item.totalAmount
    }));

    const insight = await Insight.create({
      userId,
      monthYear,
      summaryData: savedSummary,
      aiResponse
    });

    return {
      insight,
      analysisPeriod: monthLabel,
      statistics: {
        totalExpenses,
        transactionCount: expenseCount,
        currency: 'VND',
        categories
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;

    const status = getHttpStatus(error);
    let publicMessage = 'Không thể tạo lời khuyên AI. Vui lòng thử lại.';

    if (status === 429) {
      publicMessage = 'Đã vượt hạn mức gọi AI. Vui lòng thử lại sau.';
    } else if (status === 404) {
      publicMessage = 'Model Gemini không khả dụng. Hãy kiểm tra tên model.';
    } else if (status === 503) {
      publicMessage = 'Gemini đang tạm thời không khả dụng. Vui lòng thử lại sau.';
    } else if (status === 400 || status === 403) {
      publicMessage = 'Yêu cầu AI không hợp lệ hoặc API key không có quyền truy cập.';
    }

    throw serviceError(error.message || 'AI request failed', status, publicMessage);
  }
}

module.exports = { generateInsightForUser };
