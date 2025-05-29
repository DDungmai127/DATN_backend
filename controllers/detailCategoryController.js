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

// Export tất cả hàm controller
module.exports = {
  getDetailsByCategory,
};
