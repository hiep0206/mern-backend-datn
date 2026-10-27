const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const authMiddleware = require('../middlewares/auth_middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authMiddleware, authController.changePassword);

// Gắn route cập nhật ngân sách
router.put('/budget', authMiddleware, authController.updateBudget);

module.exports = router;