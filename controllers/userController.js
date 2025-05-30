const { User } = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

// Lấy danh sách người dùng (chỉ admin)
const getUsers = async (req, res) => {
  try {
    // Lấy tham số từ query
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Tính offset cho phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Thiết lập điều kiện tìm kiếm
    const whereConditions = {};
    if (search) {
      whereConditions[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Thực hiện truy vấn với phân trang
    const { rows: users, count: totalItems } = await User.findAndCountAll({
      where: whereConditions,
      attributes: { exclude: ["password"] }, // Loại trừ password
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Lấy danh sách người dùng thất bại",
      error: error.message,
    });
  }
};

// Lấy thông tin chi tiết của một người dùng
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] }, // Loại trừ password
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra xem người dùng hiện tại có quyền xem người dùng này không
    // Chỉ admin hoặc chính người dùng đó mới có quyền xem
    if (req.user.role !== "admin" && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin của người dùng này",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Lấy thông tin người dùng thất bại",
      error: error.message,
    });
  }
};

/**
 * @desc    Admin cập nhật thông tin người dùng
 * @route   PUT /api/users/:userId
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, phoneNumber, gender, dateOfBirth, address, role, isActive } = req.body;

    // Kiểm tra người dùng tồn tại
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Nếu thay đổi số điện thoại (chỉ admin mới được phép)
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      // Kiểm tra xem người dùng hiện tại có phải là admin không
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền thay đổi số điện thoại",
        });
      }

      // Kiểm tra số điện thoại đã tồn tại chưa
      const existingPhone = await User.findOne({ where: { phoneNumber } });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng",
        });
      }
    }

    // Nếu thay đổi email, cần kiểm tra xem email đã tồn tại chưa
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email này đã được sử dụng",
        });
      }
    }

    // Cập nhật thông tin
    await user.update({
      fullName: fullName || user.fullName,
      email: email || user.email,
      phoneNumber: phoneNumber || user.phoneNumber, // Chỉ admin mới thay đổi được
      gender: gender !== undefined ? gender : user.gender,
      dateOfBirth: dateOfBirth || user.dateOfBirth,
      address: address || user.address,
      role: req.user.role === "admin" ? role || user.role : user.role, // Chỉ admin mới có thể thay đổi role
      isActive: isActive !== undefined && req.user.role === "admin" ? isActive : user.isActive, // Chỉ admin mới có thể thay đổi trạng thái hoạt động
    });

    // Lấy thông tin người dùng đã cập nhật (không bao gồm mật khẩu)
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Cập nhật thông tin người dùng thất bại",
      error: error.message,
    });
  }
};

/**
 * @desc    Người dùng cập nhật thông tin cá nhân
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    // Lấy thông tin người dùng từ middleware authenticate
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để thực hiện thao tác này",
      });
    }

    const { fullName, email, address, gender, dateOfBirth, password, currentPassword } = req.body;

    // Tìm user theo ID
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Kiểm tra email đã tồn tại chưa nếu thay đổi
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email này đã được sử dụng",
        });
      }
    }

    // Xác thực mật khẩu hiện tại nếu người dùng muốn đổi mật khẩu
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu",
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại không đúng",
        });
      }

      // Hash mật khẩu mới
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Cập nhật thông tin (không cho phép cập nhật số điện thoại)
    await user.update({
      fullName: fullName || user.fullName,
      email: email || user.email,
      address: address || user.address,
      gender: gender !== undefined ? gender : user.gender,
      dateOfBirth: dateOfBirth || user.dateOfBirth,
      // Không cho phép cập nhật số điện thoại và vai trò
    });

    // Lấy thông tin người dùng đã cập nhật (không bao gồm mật khẩu)
    const { password: _, ...updatedUser } = user.toJSON();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật thông tin",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy thông tin người dùng đăng nhập
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    // Lấy thông tin người dùng từ middleware authenticate
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Loại bỏ thông tin nhạy cảm
    const { password, ...userWithoutPassword } = user.toJSON();

    return res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

// Xóa người dùng (chỉ admin)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Kiểm tra người dùng tồn tại
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Ngăn chặn việc xóa tài khoản admin
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa tài khoản quản trị viên",
      });
    }

    // Xóa người dùng
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Xóa người dùng thất bại",
      error: error.message,
    });
  }
};

/**
 * Lấy thông tin người dùng hiện tại từ token
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user đã được lấy từ token thông qua middleware authenticate
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Tìm thông tin đầy đủ của người dùng từ database
    const userDetails = await User.findByPk(user.userId, {
      attributes: ["userId", "fullName", "email", "phoneNumber", "address", "gender"],
    });

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng trong cơ sở dữ liệu",
      });
    }

    return res.status(200).json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile, // Thêm hàm mới
  getProfile, // Thêm hàm mới
  getCurrentUser, // Thêm hàm mới
};
