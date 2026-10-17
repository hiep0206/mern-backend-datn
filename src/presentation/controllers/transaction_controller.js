const transactionService = require('../../domain/services/transaction_service');

// Thêm giao dịch mới (Gắn với user đang đăng nhập)
exports.createTransaction = async (req, res) => {
    try {
        const transaction = await transactionService.createTransaction(req.user?.id, req.body);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};

// Lấy danh sách giao dịch (Chỉ lấy của đúng user đang đăng nhập)
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await transactionService.listTransactions(req.user?.id);
        res.status(200).json(transactions);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};

// Cập nhật giao dịch (Kiểm tra quyền sở hữu trước khi xóa)
exports.updateTransaction = async (req, res) => {
    try {
        const transaction = await transactionService.updateTransaction(
            req.user?.id,
            req.params.id,
            req.body
        );
        res.status(200).json(transaction);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};

// Xóa giao dịch
exports.deleteTransaction = async (req, res) => {
    try {
        const deleted = await transactionService.deleteTransaction(
            req.user?.id,
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                message: 'Không tìm thấy giao dịch hoặc không có quyền xóa.'
            });
        }

        return res.status(200).json({
            message: 'Đã xóa giao dịch thành công!'
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Lỗi server'
        });
    }
};
