const Bill = require('../../domain/models/Bill');

const getUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

exports.createBill = async (req, res) => {
    try {
        const bill = await Bill.create({ ...req.body, userId: getUserId(req) });
        res.status(201).json(bill);
    } catch (error) {
        console.error('Lỗi createBill:', error);
        res.status(500).json({ message: 'Lỗi tạo hóa đơn', error: error.message });
    }
};

exports.getBills = async (req, res) => {
    try {
        const bills = await Bill.find({ userId: getUserId(req) }).sort({ dueDate: 1 });
        res.status(200).json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách', error: error.message });
    }
};

exports.updateBill = async (req, res) => {
    try {
        const bill = await Bill.findOneAndUpdate(
            { _id: req.params.id, userId: getUserId(req) },
            req.body,
            { new: true }
        );
        if (!bill) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        res.status(200).json(bill);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
};

exports.deleteBill = async (req, res) => {
    try {
        const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: getUserId(req) });
        if (!bill) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        res.status(200).json({ message: 'Đã xóa hóa đơn' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa', error: error.message });
    }
};