const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authenticate = async (req, res, next) => {
    try {
        // Lấy token từ cookie hoặc header
        const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để tiếp tục",
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "datn");

        // Tìm người dùng theo ID
        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        // Gán thông tin người dùng vào request
        req.user = user;
        next();
    } catch (error) {
        console.error("Lỗi xác thực:", error);
        return res.status(401).json({
            success: false,
            message: "Token không hợp lệ hoặc đã hết hạn",
            error: error.message,
        });
    }
};

// Middleware xác thực không bắt buộc - cho phép tiếp tục ngay cả khi không có token
const authenticateOptional = async (req, res, next) => {
    try {
        // Lấy token từ cookie hoặc header
        const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            // Không có token, vẫn cho phép tiếp tục
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

        // Tìm người dùng theo ID
        const user = await User.findByPk(decoded.userId);

        if (user) {
            // Gán thông tin người dùng vào request
            req.user = user;
        }

        next();
    } catch (error) {
        // Lỗi xác thực, vẫn cho phép tiếp tục nhưng không có thông tin người dùng
        console.error("Lỗi xác thực không bắt buộc:", error);
        next();
    }
};

// Middleware kiểm tra quyền admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập tính năng này",
        });
    }
};

module.exports = {
    authenticate,
    authenticateOptional,
    isAdmin,
};
