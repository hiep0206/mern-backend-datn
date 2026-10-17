const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report_controller');
const authMiddleware = require('../middlewares/auth_middleware');

// Đã có các route của transaction ở đây...
// router.post('/transactions', transactionController.create);

// Thêm Route cho Báo cáo thống kê
router.get('/reports/monthly', authMiddleware, reportController.getMonthlyReport);

module.exports = router;