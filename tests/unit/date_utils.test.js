
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseDateInput
} = require('../../src/core/utils/date_utils');

test('parses YYYY-MM-DD as midnight UTC', () => {
  const result = parseDateInput('2026-10-17');

  assert.equal(
    result.toISOString(),
    '2026-10-17T00:00:00.000Z'
  );
});

test('rejects an impossible calendar date', () => {
  assert.throws(
    () => parseDateInput('2026-02-31'),
    /Ngày giao dịch không hợp lệ/
  );
});

test('rejects an invalid date string', () => {
  assert.throws(
    () => parseDateInput('not-a-date'),
    /Ngày giao dịch không hợp lệ/
  );
});

test('parses a valid ISO timestamp', () => {
  const result = parseDateInput('2026-10-17T08:30:00.000Z');

  assert.equal(
    result.toISOString(),
    '2026-10-17T08:30:00.000Z'
  );
});
