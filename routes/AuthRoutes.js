const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

/**
 * @route POST /api/auth/register
 * @desc Đăng ký tài khoản mới
 * @access Public
 */
router.post("/register", authController.register);

/**
 * @route POST /api/auth/login
 * @desc Đăng nhập
 * @access Public
 */
router.post("/login", authController.login);

/**
 * @route POST /api/auth/logout
 * @desc Đăng xuất
 * @access Public
 */
router.post("/logout", authController.logout);

/**
 * @route GET /api/auth/me
 * @desc Lấy thông tin người dùng hiện tại
 * @access Private
 */
router.get("/me", authenticate, authController.getCurrentUser);

/**
 * @route PUT /api/auth/me
 * @desc Cập nhật thông tin người dùng
 * @access Private
 */
router.put("/me", authenticate, authController.updateUser);

/**
 * @route PUT /api/auth/change-password
 * @desc Đổi mật khẩu
 * @access Private
 */
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
