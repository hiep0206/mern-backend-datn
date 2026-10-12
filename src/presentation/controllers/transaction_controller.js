const Transaction = require('../../domain/models/Transaction'); // Đường dẫn model của bạn

// Thêm giao dịch mới (Gắn với user đang đăng nhập)
exports.createTransaction = async (req, res) => {
    try {
        const { amount, type, category, note } = req.body;
        const newTransaction = new Transaction({
            userId: req.user.id, // 👈 Lấy ID từ token xác thực
            amount,
            type,
            category,
            note
        });
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách giao dịch (Chỉ lấy của đúng user đang đăng nhập)
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa giao dịch (Kiểm tra quyền sở hữu trước khi xóa)
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
        if (!transaction) {
            return res.status(404).json({ message: 'Không tìm thấy giao dịch hoặc không có quyền xóa!' });
        }
        await transaction.deleteOne();
        res.status(200).json({ message: 'Đã xóa giao dịch thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};