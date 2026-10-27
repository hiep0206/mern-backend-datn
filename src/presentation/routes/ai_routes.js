const express = require('express');
const router = express.Router();

const aiAssistantController = require('../controllers/ai_assistant_controller'); 
const authMiddleware = require('../middlewares/auth_middleware'); 

// Gắn middleware để giải mã token trước khi gọi controller xử lý AI
router.post('/generate', authMiddleware, aiAssistantController.generateInsight);

module.exports = router;