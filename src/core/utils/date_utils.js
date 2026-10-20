function parseDateInput(value) {
  const dateValue = String(value);
  let parsedDate;

  // Ngày từ input HTML thường có định dạng YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);

    parsedDate = new Date(Date.UTC(year, month - 1, day));

    // Không cho ngày không hợp lệ tự chuyển sang tháng khác.
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw createDateError();
    }
  } else {
    parsedDate = new Date(dateValue);
  }

  if (Number.isNaN(parsedDate.getTime())) {
    throw createDateError();
  }

  return parsedDate;
}

function createDateError() {
  const error = new Error('Ngày giao dịch không hợp lệ.');
  error.statusCode = 400;
  return error;
}

module.exports = { parseDateInput };