const BorrowRecord = require('../../domain/models/BorrowRecord');

exports.getAllBorrows = async (req, res) => {
  try {
    // Lấy ID của user đang đăng nhập từ token
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    // 👈 CHỐT CHẶN BẢO MẬT: Nếu không có token/userId, chặn đứng ngay và trả về danh sách trống
    if (!userId) {
      return res.status(200).json([]); 
    }
    
    // BẮT BUỘC CHỈ LẤY DỮ LIỆU CỦA ĐÚNG USER NÀY.
    const records = await BorrowRecord.find({ userId: userId }).sort({ borrowDate: -1 });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedRecords = await Promise.all(records.map(async (record) => {
      let isModified = false;

      if (!record.category || (!record.amount && !record.itemName && record.amountOrItem)) {
        const oldData = record.amountOrItem || '';
        if (!isNaN(oldData) && oldData.trim() !== '') {
          record.category = 'money';
          record.amount = Number(oldData);
        } else {
          record.category = 'item';
          record.itemName = oldData;
        }
        isModified = true;
      }

      if (record.category === 'money') {
        const totalDue = record.amount + (record.amount * (record.interestRate / 100));
        if (record.amountPaid < totalDue && record.status === 'settled') {
          record.status = 'open';
          isModified = true;
        } else if (record.amountPaid >= totalDue && record.status !== 'settled') {
          record.status = 'settled';
          isModified = true;
        }
      }

      if (record.status !== 'settled' && record.dueDate) {
        const due = new Date(record.dueDate);
        due.setHours(0, 0, 0, 0);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let newStatus = record.status;
        if (diffDays < 0) {
          newStatus = 'overdue';
        } else if (diffDays === 0) {
          newStatus = 'due_today';
        } else if (diffDays > 0 && diffDays <= 3) {
          newStatus = 'upcoming';
        } else {
          if (newStatus === 'overdue' || newStatus === 'upcoming' || newStatus === 'due_today') {
            newStatus = 'open';
          }
        }

        if (newStatus !== record.status) {
          record.status = newStatus;
          isModified = true;
        }
      }

      if (isModified) await record.save();
      return record;
    }));
    
    res.status(200).json(updatedRecords);
  } catch (error) {
    console.error("Lỗi lấy danh sách mượn trả:", error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.createBorrow = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Không tìm thấy thông tin đăng nhập!' });

    const newRecord = new BorrowRecord({
      ...req.body,
      userId: userId // Gắn chặt chủ sở hữu khi tạo mới
    });
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.updateBorrow = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Không tìm thấy thông tin đăng nhập!' });

    // Bắt buộc kiểm tra quyền: Chỉ cho phép Sửa nếu khớp userId
    const updatedRecord = await BorrowRecord.findOneAndUpdate(
      { _id: req.params.id, userId: userId }, 
      req.body, 
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ message: 'Không tìm thấy bản ghi hoặc không có quyền' });
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { paymentAmount } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Không tìm thấy thông tin đăng nhập!' });
    
    // Bắt buộc kiểm tra quyền: Chỉ cho phép Thanh toán nếu khớp userId
    const record = await BorrowRecord.findOne({ 
      _id: req.params.id, 
      userId: userId 
    });
    
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi hoặc không có quyền' });
    }

    if (record.category === 'item') {
      record.status = 'settled';
      record.paymentHistory.push({ amount: 0, date: new Date(), note: 'Đã hoàn trả đồ vật' });
    } else {
      const amountNum = Number(paymentAmount);
      record.amountPaid += amountNum;
      
      record.paymentHistory.push({ amount: amountNum, date: new Date(), note: 'Thanh toán' });

      let totalDue = record.amount;
      if (record.interestRate > 0) {
        totalDue = record.amount + (record.amount * (record.interestRate / 100));
      }
      
      if (record.amountPaid >= totalDue) {
        record.status = 'settled';
        record.amountPaid = totalDue;
      } else {
        record.status = 'open';
      }
    }
    await record.save();
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thanh toán', error: error.message });
  }
};

exports.deleteBorrow = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Không tìm thấy thông tin đăng nhập!' });
    
    // Bắt buộc kiểm tra quyền: Chỉ cho phép Xóa nếu khớp userId
    const deleted = await BorrowRecord.findOneAndDelete({ 
      _id: req.params.id, 
      userId: userId 
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi hoặc không có quyền xóa' });
    }
    res.status(200).json({ message: 'Đã xóa thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa', error: error.message });
  }
};