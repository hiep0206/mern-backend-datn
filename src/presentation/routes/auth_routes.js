const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const authMiddleware = require('../middlewares/auth_middleware'); // Kéo middleware vào

router.post('/register', authController.register);
router.post('/login', authController.login);

// Tính năng mới
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authMiddleware, authController.changePassword); // Cần vé để đổi pass

module.exports = router;