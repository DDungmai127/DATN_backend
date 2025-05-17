const { Discount, Product } = require("../models");
const { Op } = require("sequelize");

// Tạo mã giảm giá mới
const createDiscount = async (req, res) => {
  try {
    const { DiscountName, DiscountValue, StartDate, EndDate, IsActive } = req.body;

    // Kiểm tra tên giảm giá đã tồn tại chưa
    const existingDiscount = await Discount.findOne({ where: { DiscountName } });
    if (existingDiscount) {
      return res.status(400).json({
        success: false,
        message: "Tên mã giảm giá này đã tồn tại",
      });
    }

    // Validate đầu vào
    if (DiscountValue <= 0 || DiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Giá trị giảm giá phải từ 1 đến 100%",
      });
    }

    // Kiểm tra ngày bắt đầu và kết thúc
    const startDateObj = new Date(StartDate);
    const endDateObj = new Date(EndDate);

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu",
      });
    }

    // Tạo mã giảm giá mới
    const newDiscount = await Discount.create({
      DiscountName,
      DiscountValue,
      StartDate: startDateObj,
      EndDate: endDateObj,
      IsActive: IsActive !== undefined ? IsActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo mã giảm giá thành công",
      data: newDiscount,
    });
  } catch (error) {
    console.error("Create discount error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo mã giảm giá",
      error: error.message,
    });
  }
};

// Lấy danh sách mã giảm giá
const getDiscounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "StartDate",
      sortOrder = "DESC",
      isActive,
    } = req.query;

    // Tính offset cho phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Xây dựng điều kiện tìm kiếm
    const whereConditions = {};
    if (search) {
      whereConditions.DiscountName = { [Op.like]: `%${search}%` };
    }

    // Lọc theo trạng thái hoạt động
    if (isActive !== undefined) {
      whereConditions.IsActive = isActive === "true";
    }

    // Thực hiện truy vấn với phân trang
    const { rows: discounts, count: totalItems } = await Discount.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: Product,
          as: "products",
          attributes: ["productId", "productName", "price"],
        },
      ],
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: discounts,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get discounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Lấy danh sách mã giảm giá thất bại",
      error: error.message,
    });
  }
};

// Lấy thông tin chi tiết mã giảm giá
const getDiscountById = async (req, res) => {
  try {
    const { discountId } = req.params;

    const discount = await Discount.findByPk(discountId, {
      include: [
        {
          model: Product,
          as: "products",
          attributes: ["productId", "productName", "price", "imageUrl"],
        },
      ],
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    return res.status(200).json({
      success: true,
      data: discount,
    });
  } catch (error) {
    console.error("Get discount by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Lấy thông tin mã giảm giá thất bại",
      error: error.message,
    });
  }
};

// Cập nhật mã giảm giá
const updateDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const { DiscountName, DiscountValue, StartDate, EndDate, IsActive } = req.body;

    // Kiểm tra mã giảm giá tồn tại
    const discount = await Discount.findByPk(discountId);
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    // Kiểm tra tên giảm giá đã tồn tại chưa (nếu đổi tên)
    if (DiscountName && DiscountName !== discount.DiscountName) {
      const existingDiscount = await Discount.findOne({
        where: { DiscountName },
      });
      if (existingDiscount) {
        return res.status(400).json({
          success: false,
          message: "Tên mã giảm giá này đã tồn tại",
        });
      }
    }

    // Validate giá trị giảm giá
    if (DiscountValue && (DiscountValue <= 0 || DiscountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: "Giá trị giảm giá phải từ 1 đến 100%",
      });
    }

    // Validate ngày bắt đầu và kết thúc
    let startDateObj = discount.StartDate;
    let endDateObj = discount.EndDate;

    if (StartDate) {
      startDateObj = new Date(StartDate);
    }

    if (EndDate) {
      endDateObj = new Date(EndDate);
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu",
      });
    }

    // Cập nhật mã giảm giá
    await discount.update({
      DiscountName: DiscountName || discount.DiscountName,
      DiscountValue: DiscountValue || discount.DiscountValue,
      StartDate: startDateObj,
      EndDate: endDateObj,
      IsActive: IsActive !== undefined ? IsActive : discount.IsActive,
    });

    // Lấy thông tin mã giảm giá đã cập nhật
    const updatedDiscount = await Discount.findByPk(discountId, {
      include: [
        {
          model: Product,
          as: "products",
          attributes: ["productId", "productName", "price"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật mã giảm giá thành công",
      data: updatedDiscount,
    });
  } catch (error) {
    console.error("Update discount error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật mã giảm giá",
      error: error.message,
    });
  }
};

// Xóa mã giảm giá
const deleteDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;

    // Kiểm tra mã giảm giá tồn tại
    const discount = await Discount.findByPk(discountId, {
      include: [
        {
          model: Product,
          as: "products",
        },
      ],
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    // Kiểm tra xem mã giảm giá có đang được sử dụng không
    if (discount.products && discount.products.length > 0) {
      // Cập nhật discountId thành null cho các sản phẩm liên quan
      await Promise.all(
        discount.products.map(async (product) => {
          await product.update({ discountId: null });
        })
      );
    }

    // Xóa mã giảm giá
    await discount.destroy();

    return res.status(200).json({
      success: true,
      message: "Xóa mã giảm giá thành công",
    });
  } catch (error) {
    console.error("Delete discount error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa mã giảm giá",
      error: error.message,
    });
  }
};

// Sửa lại controller để phù hợp với dữ liệu gửi từ frontend
const applyDiscountToProduct = async (req, res) => {
  try {
    // Log để debug
    console.log("Request body:", req.body);

    const { discountId, productIds } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!discountId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu discountId",
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách productIds không hợp lệ",
      });
    }

    // Tìm kiếm discount
    const discount = await Discount.findByPk(discountId);
    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mã giảm giá",
      });
    }

    // Cập nhật discountId cho các sản phẩm
    const updatedCount = await Product.update(
      { discountId },
      {
        where: {
          productId: productIds,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `Đã áp dụng mã giảm giá cho ${updatedCount[0]} sản phẩm`,
      data: { updatedCount: updatedCount[0] },
    });
  } catch (error) {
    console.error("Error in applyDiscountToProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi áp dụng mã giảm giá",
      error: error.message,
    });
  }
};
// Hủy áp dụng mã giảm giá cho sản phẩm
const removeDiscountFromProduct = async (req, res) => {
  try {
    const { productIds } = req.body;

    // Kiểm tra sản phẩm tồn tại
    const products = await Product.findAll({
      where: {
        productId: {
          [Op.in]: productIds,
        },
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Một số sản phẩm không tồn tại",
      });
    }

    // Hủy áp dụng mã giảm giá cho sản phẩm
    await Promise.all(
      products.map(async (product) => {
        await product.update({ discountId: null });
      })
    );

    return res.status(200).json({
      success: true,
      message: "Hủy áp dụng mã giảm giá cho sản phẩm thành công",
    });
  } catch (error) {
    console.error("Remove discount from product error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy áp dụng mã giảm giá cho sản phẩm",
      error: error.message,
    });
  }
};

// Lấy danh sách mã giảm giá đang hoạt động
const getActiveDiscounts = async (req, res) => {
  try {
    const now = new Date();

    const activeDiscounts = await Discount.findAll({
      where: {
        IsActive: true,
        StartDate: { [Op.lte]: now },
        EndDate: { [Op.gte]: now },
      },
      include: [
        {
          model: Product,
          as: "products",
          attributes: ["productId", "productName", "price"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: activeDiscounts,
    });
  } catch (error) {
    console.error("Get active discounts error:", error);
    return res.status(500).json({
      success: false,
      message: "Lấy danh sách mã giảm giá đang hoạt động thất bại",
      error: error.message,
    });
  }
};

module.exports = {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  applyDiscountToProduct,
  removeDiscountFromProduct,
  getActiveDiscounts,
};
