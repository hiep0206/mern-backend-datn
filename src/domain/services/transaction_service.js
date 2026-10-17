const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const VALID_TYPES = new Set(['income', 'expense']);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Validate and normalize writable transaction fields.
 * The function is exported so validation can be unit-tested without a database.
 */
function normalizeTransactionInput(input = {}, { partial = false } = {}) {
  const normalized = {};

  if (!partial || input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw httpError('Số tiền phải là số lớn hơn 0.');
    }
    normalized.amount = amount;
  }

  if (!partial || input.type !== undefined) {
    if (!VALID_TYPES.has(input.type)) {
      throw httpError('Loại giao dịch phải là income hoặc expense.');
    }
    normalized.type = input.type;
  }

  if (!partial || input.category !== undefined) {
    const category = String(input.category ?? 'Khác').trim();
    if (!category) {
      throw httpError('Danh mục giao dịch không được để trống.');
    }
    normalized.category = category;
  }

  if (input.note !== undefined) {
    normalized.note = String(input.note).trim();
  } else if (!partial) {
    normalized.note = '';
  }

  if (!partial || input.date !== undefined) {
    if (input.date === undefined || input.date === null || input.date === '') {
      if (!partial) normalized.date = new Date();
    } else {
      const value = String(input.date);
      // Date input sends YYYY-MM-DD. Store midnight UTC for a stable calendar date.
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        throw httpError('Ngày giao dịch không hợp lệ.');
      }

      normalized.date = parsedDate;
    }
  }

  return normalized;
}

async function createTransaction(userId, input) {
  if (!userId) throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);

  const fields = normalizeTransactionInput(input);
  return Transaction.create({ ...fields, userId });
}

async function listTransactions(userId) {
  if (!userId) throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);

  return Transaction.find({ userId }).sort({ date: -1, createdAt: -1 });
}

async function updateTransaction(userId, transactionId, input) {
  if (!userId) throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw httpError('ID giao dịch không hợp lệ.');
  }

  const fields = normalizeTransactionInput(input, { partial: true });
  if (Object.keys(fields).length === 0) {
    throw httpError('Không có thông tin hợp lệ để cập nhật.');
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId
  });

  if (!transaction) throw httpError('Không tìm thấy giao dịch.', 404);

  Object.assign(transaction, fields);
  return transaction.save();
}

async function deleteTransaction(userId, transactionId) {
  if (!userId) throw httpError('Chưa xác định được tài khoản đăng nhập.', 401);
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
