const Goal = require('../../domain/models/Goal');

const getUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

exports.createGoal = async (req, res) => {
    try {
        const goal = await Goal.create({ ...req.body, userId: getUserId(req) });
        res.status(201).json(goal);
    } catch (error) {
        console.error('Lỗi createGoal:', error);
        res.status(500).json({ message: 'Lỗi tạo mục tiêu', error: error.message });
    }
};

exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: getUserId(req) }).sort({ createdAt: -1 });
        res.status(200).json(goals);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách mục tiêu', error: error.message });
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: getUserId(req) });
        if (!goal) return res.status(404).json({ message: 'Không tìm thấy mục tiêu' });
        res.status(200).json({ message: 'Đã xóa mục tiêu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa mục tiêu', error: error.message });
    }
};