const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrow_controller');
const authMiddleware = require('../middlewares/auth_middleware'); // 👈 Đảm bảo đường dẫn này đúng với project của bạn

// 👈 GẮN MIDDLEWARE VÀO ĐÂY ĐỂ BẮT BUỘC KIỂM TRA TOKEN CHO MỌI REQUEST MƯỢN TRẢ
router.use(authMiddleware);

router.get('/', borrowController.getAllBorrows);
router.post('/', borrowController.createBorrow);
router.put('/:id', borrowController.updateBorrow);
router.put('/:id/payment', borrowController.addPayment);
router.delete('/:id', borrowController.deleteBorrow);

module.exports = router;