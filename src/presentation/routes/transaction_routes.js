const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction_controller');
const authMiddleware = require('../middlewares/auth_middleware'); // Hoặc đường dẫn middleware xác thực token của bạn

// Đảm bảo tất cả các hàm truyền vào đây đều phải là function hợp lệ
router.use(authMiddleware); // Yêu cầu đăng nhập cho tất cả các route giao dịch

router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;