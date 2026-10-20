
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { VALID_TYPES } = require('../../core/constants/transaction_types');
const { parseDateInput } = require('../../core/utils/date_utils');

const VALID_TYPE_SET = new Set(VALID_TYPES);

/**
 * Tạo lỗi có mã HTTP để controller trả về đúng trạng thái.
 */
function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Chuẩn hóa và kiểm tra dữ liệu đầu vào của giao dịch.
 *
 * partial = false: kiểm tra dữ liệu khi tạo giao dịch.
 * partial = true: chỉ xử lý những trường được gửi khi cập nhật.
 *
 * Hàm này không truy cập database để có thể kiểm thử độc lập.
 */
function normalizeTransactionInput(input = {}, { partial = false } = {}) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw httpError('Dữ liệu giao dịch không hợp lệ.');
  }

  const normalized = {};

  // 1. Kiểm tra số tiền.
  if (!partial || input.amount !== undefined) {
    const amount = Number(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw httpError('Số tiền phải là số lớn hơn 0.');
    }

    normalized.amount = amount;
  }

  // 2. Kiểm tra loại giao dịch.
  if (!partial || input.type !== undefined) {
    if (!VALID_TYPE_SET.has(input.type)) {
      throw httpError('Loại giao dịch phải là income hoặc expense.');
    }

    normalized.type = input.type;
  }

  // 3. Chuẩn hóa danh mục.
  if (!partial || input.category !== undefined) {
    const category = String(input.category ?? 'Khác').trim();

    if (!category) {
      throw httpError('Danh mục giao dịch không được để trống.');
    }

    normalized.category = category;
  }

  // 4. Chuẩn hóa ghi chú.
  if (input.note !== undefined) {
    normalized.note = String(input.note ?? '').trim();
  } else if (!partial) {
    normalized.note = '';
  }

  // 5. Xử lý ngày thông qua core/utils/date_utils.js.
  if (!partial || input.date !== undefined) {
    if (
      input.date === undefined ||
      input.date === null ||
      input.date === ''
    ) {
      // Khi tạo mới, mặc định ngày hiện tại.
      // Khi cập nhật một phần, giữ nguyên ngày cũ nếu không có ngày mới.
      if (!partial) {
        normalized.date = new Date();
      }
    } else {
      normalized.date = parseDateInput(input.date);
    }
  }

  return normalized;
}

/**
 * Tạo giao dịch thuộc tài khoản đang đăng nhập.
 */
async function createTransaction(userId, input) {
  if (!userId) {
    throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
  }

  const fields = normalizeTransactionInput(input);

  return Transaction.create({
    ...fields,
    userId
  });
}

/**
 * Lấy danh sách giao dịch của đúng tài khoản.
 */
async function listTransactions(userId) {
  if (!userId) {
    throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
  }

  return Transaction.find({ userId })
    .sort({ date: -1, createdAt: -1 });
}

/**
 * Cập nhật giao dịch sau khi xác minh quyền sở hữu.
 */
async function updateTransaction(userId, transactionId, input) {
  if (!userId) {
    throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw httpError('ID giao dịch không hợp lệ.');
  }

  const fields = normalizeTransactionInput(input, {
    partial: true
  });

  if (Object.keys(fields).length === 0) {
    throw httpError('Không có thông tin hợp lệ để cập nhật.');
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId
  });

  if (!transaction) {
    throw httpError('Không tìm thấy giao dịch.', 404);
  }

  Object.assign(transaction, fields);

  return transaction.save();
}

/**
 * Xóa giao dịch thuộc tài khoản đang đăng nhập.
 */
async function deleteTransaction(userId, transactionId) {
  if (!userId) {
    throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw httpError('ID giao dịch không hợp lệ.');
  }

  return Transaction.findOneAndDelete({
    _id: transactionId,
    userId
  });
}

module.exports = {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  normalizeTransactionInput
};
