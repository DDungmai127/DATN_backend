const { User } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Đăng ký tài khoản mới
const register = async (req, res) => {
  try {
    const { phoneNumber, password, fullName, gender, dateOfBirth, email, address } = req.body;

    // Kiểm tra số điện thoại đã tồn tại chưa
    const existingUser = await User.findOne({ where: { phoneNumber } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đã được sử dụng",
      });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const newUser = await User.create({
      phoneNumber,
      password: hashedPassword,
      fullName,
      gender,
      dateOfBirth: dateOfBirth || null,
      email: email || null,
      address: address || null,
      role: "customer", // Mặc định là khách hàng
    });

    // Tạo JWT token
    const token = jwt.sign(
      {
        userId: newUser.userId,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
      },
      process.env.JWT_SECRET || "datn",
      { expiresIn: "7d" }
    );

    // Set cookie chứa token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // Không trả về mật khẩu trong response
    const { password: _, ...userWithoutPassword } = newUser.toJSON();

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đăng ký",
      error: error.message,
    });
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Tìm người dùng theo số điện thoại
    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không chính xác",
      });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không chính xác",
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      process.env.JWT_SECRET || "datn",
      { expiresIn: "7d" }
    );

    // Set cookie chứa token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // Không trả về mật khẩu trong response
    const { password: _, ...userWithoutPassword } = user.toJSON();

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đăng nhập",
      error: error.message,
    });
  }
};

// Đăng xuất
const logout = (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({
    success: true,
    message: "Đăng xuất thành công",
  });
};

// Lấy thông tin người dùng hiện tại
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] }, // Loại bỏ trường password
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

// Cập nhật thông tin người dùng
const updateUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, gender, dateOfBirth, email, address } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra email đã tồn tại chưa (nếu cung cấp và thay đổi)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email đã được sử dụng",
        });
      }
    }

    // Cập nhật thông tin
    await user.update({
      fullName: fullName || user.fullName,
      gender: gender || user.gender,
      dateOfBirth: dateOfBirth || user.dateOfBirth,
      email: email || user.email,
      address: address || user.address,
    });

    // Không trả về mật khẩu trong response
    const { password: _, ...userWithoutPassword } = user.toJSON();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin người dùng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật thông tin người dùng",
      error: error.message,
    });
  }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
      });
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu
    await user.update({
      password: hashedPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đổi mật khẩu",
      error: error.message,
    });
  }
};
// Refesh Token Function if needed
module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  updateUser,
  changePassword,
};
