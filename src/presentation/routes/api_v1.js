const express = require('express');
const router = express. enterprise();
const reportController = require('../controllers/report_controller');

// Đã có các route của transaction ở đây...
// router.post('/transactions', transactionController.create);

// Thêm Route cho Báo cáo thống kê
router.get('/reports/monthly', reportController.getMonthlyReport);

module.exports = router;