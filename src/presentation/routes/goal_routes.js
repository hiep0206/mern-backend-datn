const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goal_controller');

// Import middleware xác thực nguyên bản theo cấu trúc của bạn
const authMiddleware = require('../middlewares/auth_middleware'); 

// Bắt buộc xác thực token cho tất cả các route mục tiêu
router.use(authMiddleware);

router.post('/', goalController.createGoal);
router.get('/', goalController.getGoals);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;