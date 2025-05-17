const { DetailCategory_Product, DetailCategory, Product } = require("../models");
const { Op } = require("sequelize");

/**
 * Thêm sản phẩm vào danh mục chi tiết
 */
const addProductToDetailCategory = async (req, res) => {
  try {
    const { detailCategoryId, productId } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!detailCategoryId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp detailCategoryId và productId",
      });
    }

    // Kiểm tra danh mục chi tiết có tồn tại không
    const existingDetailCategory = await DetailCategory.findByPk(detailCategoryId);
    if (!existingDetailCategory) {
      return res.status(404).json({
        success: false,
        message: "Danh mục chi tiết không tồn tại",
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await Product.findByPk(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Kiểm tra xem liên kết đã tồn tại chưa
    const existingLink = await DetailCategory_Product.findOne({
      where: {
        DetailCategoryID: detailCategoryId,
        ProductID: productId,
      },
    });

    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm đã tồn tại trong danh mục chi tiết này",
      });
    }

    // Thêm mới liên kết
    const newLink = await DetailCategory_Product.create({
      DetailCategoryID: detailCategoryId,
      ProductID: productId,
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm sản phẩm vào danh mục chi tiết thành công",
      data: newLink,
    });
  } catch (error) {
    console.error("Error linking product to detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thêm sản phẩm vào danh mục chi tiết",
      error: error.message,
    });
  }
};

/**
 * Xóa sản phẩm khỏi danh mục chi tiết
 */
const removeProductFromDetailCategory = async (req, res) => {
  try {
    const { detailCategoryId, productId } = req.params;

    // Kiểm tra liên kết có tồn tại không
    const existingLink = await DetailCategory_Product.findOne({
      where: {
        DetailCategoryID: detailCategoryId,
        ProductID: productId,
      },
    });

    if (!existingLink) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy liên kết giữa sản phẩm và danh mục chi tiết",
      });
    }

    // Xóa liên kết
    await existingLink.destroy();

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi danh mục chi tiết thành công",
    });
  } catch (error) {
    console.error("Error removing product from detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa sản phẩm khỏi danh mục chi tiết",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách sản phẩm trong một danh mục chi tiết
 */
const getProductsByDetailCategory = async (req, res) => {
  try {
    const { detailCategoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra danh mục chi tiết có tồn tại không
    const existingDetailCategory = await DetailCategory.findByPk(detailCategoryId);
    if (!existingDetailCategory) {
      return res.status(404).json({
        success: false,
        message: "Danh mục chi tiết không tồn tại",
      });
    }

    // Tính offset cho phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Lấy danh sách sản phẩm thuộc danh mục chi tiết
    const { count, rows: products } = await Product.findAndCountAll({
      include: [
        {
          model: DetailCategory_Product,
          as: "detailCategories",
          where: { DetailCategoryID: detailCategoryId },
          attributes: [],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting products by detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm theo danh mục chi tiết",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách danh mục chi tiết của một sản phẩm
 */
const getDetailCategoriesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await Product.findByPk(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Lấy danh sách danh mục chi tiết của sản phẩm
    const detailCategories = await DetailCategory.findAll({
      include: [
        {
          model: DetailCategory_Product,
          as: "productLinks",
          where: { ProductID: productId },
          attributes: [],
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: detailCategories,
    });
  } catch (error) {
    console.error("Error getting detail categories by product:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách danh mục chi tiết theo sản phẩm",
      error: error.message,
    });
  }
};

/**
 * Thêm nhiều sản phẩm vào một danh mục chi tiết
 */
const addMultipleProductsToDetailCategory = async (req, res) => {
  try {
    const { detailCategoryId, productIds } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!detailCategoryId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp detailCategoryId và mảng productIds",
      });
    }

    // Kiểm tra danh mục chi tiết có tồn tại không
    const existingDetailCategory = await DetailCategory.findByPk(detailCategoryId);
    if (!existingDetailCategory) {
      return res.status(404).json({
        success: false,
        message: "Danh mục chi tiết không tồn tại",
      });
    }

    // Kiểm tra các sản phẩm tồn tại
    const existingProducts = await Product.findAll({
      where: { productId: productIds },
    });

    if (existingProducts.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Một số sản phẩm không tồn tại",
        foundProducts: existingProducts.map((p) => p.productId),
      });
    }

    // Tìm các liên kết đã tồn tại
    const existingLinks = await DetailCategory_Product.findAll({
      where: {
        DetailCategoryID: detailCategoryId,
        ProductID: {
          [Op.in]: productIds,
        },
      },
    });

    const existingProductIds = existingLinks.map((link) => link.ProductID);

    // Lọc ra các sản phẩm chưa được liên kết
    const newProductIds = productIds.filter((id) => !existingProductIds.includes(id));

    // Tạo các liên kết mới
    const newLinks = await Promise.all(
      newProductIds.map((productId) =>
        DetailCategory_Product.create({
          DetailCategoryID: detailCategoryId,
          ProductID: productId,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Đã thêm sản phẩm vào danh mục chi tiết thành công",
      data: {
        added: newLinks.length,
        skipped: existingLinks.length,
        total: productIds.length,
      },
    });
  } catch (error) {
    console.error("Error adding multiple products to detail category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thêm nhiều sản phẩm vào danh mục chi tiết",
      error: error.message,
    });
  }
};

module.exports = {
  addProductToDetailCategory,
  removeProductFromDetailCategory,
  getProductsByDetailCategory,
  getDetailCategoriesByProduct,
  addMultipleProductsToDetailCategory,
};
