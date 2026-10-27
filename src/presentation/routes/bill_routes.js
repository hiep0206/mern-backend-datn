const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill_controller');
const authMiddleware = require('../middlewares/auth_middleware');

// Bắt buộc xác thực token
router.use(authMiddleware);

router.post('/', billController.createBill);
router.get('/', billController.getBills);
router.put('/:id', billController.updateBill);
router.delete('/:id', billController.deleteBill);

module.exports = router;