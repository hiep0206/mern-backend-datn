const express = require('express');
const router = express.Router();

// Tùy thuộc vào tên file controller của bạn, hãy sửa lại đường dẫn require cho đúng nếu cần.
// Do ở bước trước file controller tên là ai_assistant_controller.js nên mình để đường dẫn tương ứng:
const aiAssistantController = require('../controllers/ai_assistant_controller'); 

// 👈 CHÌA KHÓA NẰM Ở ĐÂY: Import middleware xác thực
const authMiddleware = require('../middlewares/auth_middleware'); 

// 👈 GẮN MIDDLEWARE VÀO ROUTE ĐỂ NÓ GIẢI MÃ TOKEN TRƯỚC KHI GỌI CONTROLLER
router.post('/generate', authMiddleware, aiAssistantController.generateInsight);

module.exports = router;