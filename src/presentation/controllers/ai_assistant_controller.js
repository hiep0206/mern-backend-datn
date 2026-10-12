
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');

const Transaction = require('../../domain/models/Transaction');
const Insight = require('../../domain/models/Insight');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CURRENCY = 'VNĐ';

// Lấy tháng hiện tại theo giờ Việt Nam, không phụ thuộc múi giờ server.
function getCurrentVietnamMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  const year = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);

  // Việt Nam sử dụng UTC+7.
  const utcOffset = 7 * 60 * 60 * 1000;

  const startDate = new Date(
    Date.UTC(year, month - 1, 1) - utcOffset
  );

  const endDate = new Date(
    Date.UTC(year, month, 1) - utcOffset
  );

  return {
    year,
    month,
    monthYear: `${year}-${String(month).padStart(2, '0')}`,
    monthLabel: `tháng ${month}/${year}`,
    startDate,
    endDate
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

exports.generateInsight = async (req, res) => {
  try {
    // 1. Kiểm tra API key.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return res.status(500).json({
        message: 'Chưa cấu hình GEMINI_API_KEY trong file .env'
      });
    }

    // 2. Lấy tài khoản từ middleware xác thực.
    const rawUserId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId;

    if (!rawUserId) {
      return res.status(401).json({
        message: 'Không xác định được tài khoản đăng nhập.'
      });
    }

    // 3. Xác định trường liên kết tài khoản trong model.
    let ownerField = null;

    if (Transaction.schema.path('userId')) {
      ownerField = 'userId';
    } else if (Transaction.schema.path('user')) {
      ownerField = 'user';
    }

    if (!ownerField) {
      console.error(
        '[AI] Model Transaction thiếu trường userId hoặc user.'
      );

      return res.status(500).json({
        message:
          'Cấu trúc model giao dịch chưa có trường liên kết tài khoản.'
      });
    }

    // 4. Chuyển ID về đúng kiểu dữ liệu của schema.
    const ownerPath = Transaction.schema.path(ownerField);
    const userIdString = String(rawUserId);

    let ownerId = rawUserId;

    if (ownerPath.instance === 'ObjectId') {
      if (!mongoose.Types.ObjectId.isValid(userIdString)) {
        return res.status(401).json({
          message: 'ID tài khoản không hợp lệ.'
        });
      }

      ownerId = new mongoose.Types.ObjectId(userIdString);
    } else if (ownerPath.instance === 'String') {
      ownerId = userIdString;
    }

    // 5. Xác định trường ngày có kiểu Date trong model.
    // Ưu tiên ngày giao dịch; dùng createdAt nếu không có trường phù hợp.
    const dateCandidates = [
      'date',
      'transactionDate',
      'transaction_date',
      'createdAt',
      'created_at'
    ];

    const dateField = dateCandidates.find(field => {
      const path = Transaction.schema.path(field);
      return path && path.instance === 'Date';
    });

    const currentMonth = getCurrentVietnamMonth();

    const {
      monthYear,
      monthLabel,
      startDate,
      endDate
    } = currentMonth;

    let periodLabel = monthLabel;
    const matchCondition = {
      [ownerField]: ownerId,
      type: 'expense'
    };

    // Có trường ngày hợp lệ thì chỉ phân tích tháng hiện tại.
    // Nếu model không có trường ngày kiểu Date, ghi rõ phạm vi toàn lịch sử.
    if (dateField) {
      matchCondition[dateField] = {
        $gte: startDate,
        $lt: endDate
      };
    } else {
      periodLabel =
        'toàn bộ lịch sử giao dịch (model chưa có trường ngày kiểu Date)';

      console.warn(
        '[AI] Không tìm thấy trường ngày kiểu Date. ' +
        'Báo cáo sẽ sử dụng toàn bộ lịch sử giao dịch.'
      );
    }

    console.log(`[AI] Phạm vi phân tích: ${periodLabel}`);
    console.log(`[AI] Trường ngày: ${dateField || 'không có'}`);

    // 6. Tìm số giao dịch phù hợp trước khi tổng hợp.
    const expenseCount = await Transaction.countDocuments(
      matchCondition
    );

    console.log(
      `[AI] Số giao dịch chi tiêu tìm thấy: ${expenseCount}`
    );

    if (expenseCount === 0) {
      return res.status(400).json({
        message: dateField
          ? `Bạn chưa có giao dịch chi tiêu trong ${monthLabel}.`
          : 'Chưa tìm thấy giao dịch chi tiêu của tài khoản này. ' +
            'Vui lòng kiểm tra userId, type và dữ liệu MongoDB.',
        analysisPeriod: periodLabel
      });
    }

    // 7. Tính tổng tiền và số giao dịch ở backend.
    const summary = await Transaction.aggregate([
      {
        $match: matchCondition
      },
      {
        $group: {
          _id: {
            $ifNull: ['$category', 'Chưa phân loại']
          },
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
          transactionCount: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          totalAmount: -1
        }
      }
    ]);

    if (summary.length === 0) {
      return res.status(400).json({
        message:
          'Không tổng hợp được chi tiêu. ' +
          'Vui lòng kiểm tra trường amount và category.',
        analysisPeriod: periodLabel
      });
    }

    // 8. Tính số liệu thống kê bằng code, không để AI tự tính.
    const totalExpenses = summary.reduce(
      (total, item) => total + Number(item.totalAmount || 0),
      0
    );

    const categories = summary.map(item => {
      const amount = Number(item.totalAmount || 0);

      const percentage = totalExpenses > 0
        ? Number(((amount / totalExpenses) * 100).toFixed(1))
        : 0;

      return {
        category: String(item._id || 'Chưa phân loại'),
        totalAmount: amount,
        transactionCount: Number(item.transactionCount || 0),
        percentage
      };
    });

    const categoryText = categories.map(item => {
      return (
        `- Danh mục: ${item.category}\n` +
        `  Tổng tiền: ${formatVND(item.totalAmount)}\n` +
        `  Tỷ trọng: ${item.percentage}%\n` +
        `  Số giao dịch: ${item.transactionCount}`
      );
    }).join('\n');

    const largestCategory = categories[0];

    // 9. Tạo prompt với số liệu đã được backend tính toán.
    const prompt = `
Bạn là trợ lý phân tích tài chính cá nhân.
Hãy viết báo cáo ngắn gọn, dễ hiểu bằng tiếng Việt và sử dụng Markdown.

PHẠM VI DỮ LIỆU
${periodLabel}

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

1. Danh mục chi tiêu lớn nhất
Nêu tên danh mục, tổng tiền và tỷ trọng đã cung cấp.

2. Nhận xét tình hình chi tiêu
- Nêu tổng chi tiêu trong đúng phạm vi dữ liệu.
- Đánh giá tỷ trọng của các danh mục dựa trên số liệu.
- Không kết luận tổng chi tiêu cao hay thấp nếu không có
  thu nhập, ngân sách hoặc dữ liệu kỳ trước để so sánh.
- Không suy đoán dữ liệu bao phủ bao nhiêu ngày nếu không biết.
- Nếu dữ liệu chỉ thuộc tháng hiện tại, nói rõ đây là số liệu
  tính đến thời điểm phân tích, không phải cả tháng đã kết thúc.

3. Ba lời khuyên thực tế
- Đưa ra đúng 3 lời khuyên cụ thể, gắn với các danh mục thực tế.
- Không mặc định khoản chi lớn là khoản chi lãng phí.
- Không khuyên cắt giảm chi phí thiết yếu một cách máy móc.
- Nếu chưa có thu nhập hoặc ngân sách, hãy khuyên người dùng
  xác định ngân sách trước thay vì tự đặt ra một mức tiết kiệm.
- Không tự bịa số liệu, thời gian, nguyên nhân hoặc tỷ lệ.
- Không tính lại các tổng và tỷ trọng đã được cung cấp.

Trình bày bằng ba tiêu đề rõ ràng, kèm gạch đầu dòng khi phù hợp.
Giữ giọng văn thân thiện, chuyên nghiệp, thực tế.
`;

    // 10. Gọi Gemini, thử lại một lần khi dịch vụ tạm thời lỗi.
    const genAI = new GoogleGenerativeAI(apiKey.trim());

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite'
    });

    let result = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        const status = getHttpStatus(error);
        const retryable = [
          429, 500, 502, 503, 504
        ].includes(status);

        if (!retryable || attempt === 1) {
          throw error;
        }

        console.warn(
          `[AI] Lần gọi ${attempt + 1} thất bại. Đang thử lại.`
        );

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!result) {
      throw new Error('Gemini chưa trả về kết quả.');
    }

    const aiResponse = result.response.text();

    if (!aiResponse || !aiResponse.trim()) {
      throw new Error('Gemini trả về nội dung rỗng.');
    }

    // 11. Lưu insight; giữ cấu trúc summaryData ban đầu.
    // Không thêm các trường thống kê mới vào schema lưu trữ cũ.
    const savedSummary = summary.map(item => ({
      _id: item._id,
      totalAmount: item.totalAmount
    }));

    const insightUserId = mongoose.Types.ObjectId.isValid(userIdString)
      ? new mongoose.Types.ObjectId(userIdString)
      : rawUserId;

    const newInsight = new Insight({
      userId: insightUserId,
      monthYear,
      summaryData: savedSummary,
      aiResponse
    });

    await newInsight.save();

    // 12. Trả kết quả về frontend.
    return res.status(200).json({
      message: 'Đã phân tích thành công',
      insight: newInsight,
      analysisPeriod: periodLabel,
      statistics: {
        totalExpenses,
        transactionCount: expenseCount,
        currency: 'VND',
        categories
      }
    });

  } catch (error) {
    console.error('[AI] Lỗi chi tiết:', error);

    const status = getHttpStatus(error);

    let message =
      'Không thể tạo lời khuyên AI. Vui lòng thử lại.';

    if (status === 503) {
      message = 'Gemini đang quá tải. Vui lòng thử lại sau.';
    } else if (status === 429) {
      message = 'Đã vượt hạn mức gọi AI. Vui lòng thử lại sau.';
    } else if (status === 404) {
      message =
        'Model Gemini không khả dụng. Hãy kiểm tra tên model.';
    } else if (status === 400 || status === 403) {
      message =
        'Yêu cầu AI không hợp lệ hoặc API key không có quyền truy cập.';
    } else if (error.name === 'ValidationError') {
      message =
        'Dữ liệu lưu kết quả phân tích không đúng schema Insight.';
    } else if (error.name === 'CastError') {
      message =
        'Kiểu dữ liệu không hợp lệ trong giao dịch hoặc kết quả phân tích.';
    }

    const httpStatus = [
      400, 401, 403, 404, 429, 503
    ].includes(status)
      ? status
      : 500;

    return res.status(httpStatus).json({
      message,
      error: error.message || 'Lỗi không xác định'
    });
  }
};
