const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTransactionInput } = require('../../src/domain/services/transaction_service');

test('normalizes transaction amount, type, category, note and date', () => {
  const result = normalizeTransactionInput({
    amount: '850000',
    type: 'expense',
    category: 'Nhà cửa',
    note: '  Tiền điện  ',
    date: '2026-10-16'
  });

  assert.equal(result.amount, 850000);
  assert.equal(result.type, 'expense');
  assert.equal(result.category, 'Nhà cửa');
  assert.equal(result.note, 'Tiền điện');
  assert.equal(result.date.toISOString(), '2026-10-16T00:00:00.000Z');
});

test('rejects zero or non-numeric amounts', () => {
  assert.throws(() => normalizeTransactionInput({
    amount: '0',
    type: 'expense',
    category: 'Ăn uống'
  }), /lớn hơn 0/);

  assert.throws(() => normalizeTransactionInput({
    amount: 'abc',
    type: 'expense',
    category: 'Ăn uống'
  }), /lớn hơn 0/);
});

test('rejects unsupported transaction types', () => {
  assert.throws(() => normalizeTransactionInput({
    amount: 10000,
    type: 'transfer',
    category: 'Khác'
  }), /Loại giao dịch/);
});

test('rejects invalid calendar dates instead of silently rolling into another month', () => {
  assert.throws(() => normalizeTransactionInput({
    amount: 10000,
    type: 'expense',
    category: 'Khác',
    date: '2026-02-31'
  }), /Ngày giao dịch không hợp lệ/);
});

test('partial update only normalizes fields that were provided', () => {
  const result = normalizeTransactionInput({ note: '  Cập nhật  ' }, {
    partial: true
  });

  assert.deepEqual(result, { note: 'Cập nhật' });
});
