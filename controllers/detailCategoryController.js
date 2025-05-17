const { Category, DetailCategory } = require("../models");

// Lấy tất cả chi tiết của một danh mục
const getDetailsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Lấy chi tiết phân loại
    const details = await DetailCategory.findAll({
      where: { CategoryID: categoryId },
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Error getting category details:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy chi tiết phân loại",
      error: error.message,
    });
  }
};

// Thêm chi tiết phân loại cho danh mục
const createDetailCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { detailType, detailValue } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!detailType || !detailValue) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin chi tiết phân loại",
      });
    }

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Tạo chi tiết phân loại mới
    const newDetail = await DetailCategory.create({
      CategoryID: categoryId,
      DetailType: detailType,
      DetailValue: detailValue,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo chi tiết phân loại thành công",
      data: newDetail,
    });
  } catch (error) {
    console.error("Error creating detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo chi tiết phân loại",
      error: error.message,
    });
  }
};

// Cập nhật chi tiết phân loại
const updateDetailCategory = async (req, res) => {
  try {
    const { detailId } = req.params;
    const { detailType, detailValue } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!detailType || !detailValue) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin chi tiết phân loại",
      });
    }

    // Tìm chi tiết phân loại
    const detail = await DetailCategory.findByPk(detailId);
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chi tiết phân loại",
      });
    }

    // Cập nhật chi tiết
    await detail.update({
      DetailType: detailType,
      DetailValue: detailValue,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật chi tiết phân loại thành công",
      data: detail,
    });
  } catch (error) {
    console.error("Error updating detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật chi tiết phân loại",
      error: error.message,
    });
  }
};

// Xóa chi tiết phân loại
const deleteDetailCategory = async (req, res) => {
  try {
    const { detailId } = req.params;

    // Tìm chi tiết phân loại
    const detail = await DetailCategory.findByPk(detailId);
    if (!detail) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chi tiết phân loại",
      });
    }

    // Xóa chi tiết
    await detail.destroy();

    return res.status(200).json({
      success: true,
      message: "Đã xóa chi tiết phân loại thành công",
    });
  } catch (error) {
    console.error("Error deleting detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa chi tiết phân loại",
      error: error.message,
    });
  }
};

// Xóa tất cả chi tiết của một danh mục
const deleteAllDetailsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Xóa tất cả chi tiết của danh mục
    const deletedCount = await DetailCategory.destroy({
      where: { CategoryID: categoryId },
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa ${deletedCount} chi tiết phân loại của danh mục`,
    });
  } catch (error) {
    console.error("Error deleting all details of category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa chi tiết phân loại",
      error: error.message,
    });
  }
};

// Export tất cả hàm controller
module.exports = {
  getDetailsByCategory,
  createDetailCategory,
  updateDetailCategory,
  deleteDetailCategory,
  deleteAllDetailsByCategory,
};
