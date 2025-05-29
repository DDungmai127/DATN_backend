const { Category, DetailCategory, Product, Sequelize } = require("../models");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
// Lấy tất cả danh mục
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["categoryId", "categoryName", "description", "categoryImage"],
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách danh mục",
      error: error.message,
    });
  }
};

// Lấy chi tiết danh mục theo ID
const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId, {
      include: [
        {
          model: DetailCategory,
          as: "detailCategories",
          attributes: ["detailCategoryId", "detailType", "detailValue"],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy chi tiết danh mục",
      error: error.message,
    });
  }
};

// Lấy sản phẩm theo danh mục
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, sort, filter, detailFilter } = req.query;

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Xây dựng điều kiện truy vấn
    const where = { categoryId, status: "active" };

    // Thêm bộ lọc nếu có
    if (filter) {
      try {
        const filterObj = JSON.parse(filter);
        Object.keys(filterObj).forEach((key) => {
          where[key] = filterObj[key];
        });
      } catch (e) {
        console.error("Lỗi khi phân tích bộ lọc:", e);
      }
    }

    // Thiết lập sắp xếp
    const order = [];
    if (sort) {
      try {
        const sortObj = JSON.parse(sort);
        Object.keys(sortObj).forEach((key) => {
          order.push([key, sortObj[key].toUpperCase()]);
        });
      } catch (e) {
        console.error("Lỗi khi phân tích sắp xếp:", e);
        order.push(["createdAt", "DESC"]); // Mặc định sắp xếp theo thời gian tạo mới nhất
      }
    } else {
      order.push(["createdAt", "DESC"]);
    }

    // Tính toán phân trang
    const offset = (page - 1) * limit;

    // Thiết lập include cho DetailCategory nếu có filter
    const includeDetailCategory = [];
    if (detailFilter) {
      try {
        const detailFilterObj = JSON.parse(detailFilter);
        Object.keys(detailFilterObj).forEach((detailType) => {
          includeDetailCategory.push({
            model: DetailCategory,
            as: "detailCategories",
            where: {
              detailType,
              detailValue: {
                [Op.in]: Array.isArray(detailFilterObj[detailType])
                  ? detailFilterObj[detailType]
                  : [detailFilterObj[detailType]],
              },
            },
            attributes: ["detailCategoryId", "detailType", "detailValue"],
          });
        });
      } catch (e) {
        console.error("Lỗi khi phân tích bộ lọc chi tiết:", e);
      }
    }

    // Lấy sản phẩm
    const products = await Product.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset,
      include: includeDetailCategory,
      distinct: true, // Quan trọng để đếm đúng khi sử dụng include
      attributes: [
        "productId",
        "productName",
        "description",
        "imageUrl",
        "price",
        "unitOfMeasurement",
        "status",
        "slug",
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        products: products.rows,
        pagination: {
          totalItems: products.count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(products.count / limit),
          itemsPerPage: parseInt(limit),
        },
        categoryInfo: {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm theo danh mục",
      error: error.message,
    });
  }
};

// Lấy tất cả chi tiết danh mục
const getAllDetailCategories = async (req, res) => {
  try {
    const detailCategories = await DetailCategory.findAll({
      attributes: ["detailCategoryId", "categoryId", "detailType", "detailValue"],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: detailCategories,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chi tiết danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách chi tiết danh mục",
      error: error.message,
    });
  }
};

// Lấy chi tiết danh mục theo loại và danh mục
const getDetailCategoriesByType = async (req, res) => {
  try {
    const { categoryId, detailType } = req.params;

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Tìm tất cả chi tiết danh mục theo loại và danh mục
    const detailCategories = await DetailCategory.findAll({
      where: {
        categoryId,
        detailType,
      },
      attributes: ["detailCategoryId", "detailType", "detailValue"],
    });

    if (detailCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy chi tiết danh mục loại '${detailType}' cho danh mục này`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        categoryInfo: {
          categoryId: category.categoryId,
          categoryName: category.categoryName,
        },
        detailType,
        detailValues: detailCategories,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết danh mục theo loại:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy chi tiết danh mục theo loại",
      error: error.message,
    });
  }
};

const getDistinctDetailTypesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Kiểm tra xem có cung cấp categoryId hay không
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp CategoryId",
      });
    }

    // Lấy tất cả các DetailType duy nhất trong category
    const uniqueDetailTypes = await DetailCategory.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("DetailType")), "DetailType"]],
      where: {
        CategoryId: categoryId,
      },
      raw: true,
    });

    // Trích xuất mảng các DetailType từ kết quả
    const detailTypes = uniqueDetailTypes.map((item) => item.DetailType);

    return res.status(200).json({
      success: true,
      data: detailTypes,
    });
  } catch (error) {
    console.error(
      `Error fetching unique DetailTypes for category ${req.params.categoryId}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống, không thể lấy danh sách loại chi tiết.",
    });
  }
};

// ==== ADMIN CONTROLLERS ====
const getDetailStructureByCategoryId = async (req, res) => {
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

    // 1. Lấy tất cả các DetailType duy nhất
    const uniqueDetailTypes = await DetailCategory.findAll({
      attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("DetailType")), "DetailType"]],
      where: { CategoryId: categoryId },
      raw: true,
    });

    const detailTypes = uniqueDetailTypes.map((item) => item.DetailType);

    // 2. Lấy tất cả chi tiết phân loại của danh mục
    const allDetails = await DetailCategory.findAll({
      attributes: ["DetailCategoryId", "DetailType", "DetailValue"],
      where: { CategoryId: categoryId },
      order: [
        ["DetailType", "ASC"],
        ["DetailValue", "ASC"],
      ],
    });

    // 3. Tổ chức dữ liệu theo DetailType
    const detailValuesByType = {};

    detailTypes.forEach((type) => {
      detailValuesByType[type] = allDetails
        .filter((detail) => detail.DetailType === type)
        .map((detail) => ({
          DetailCategoryId: detail.DetailCategoryId,
          DetailValue: detail.DetailValue,
        }));
    });

    return res.status(200).json({
      success: true,
      data: {
        detailTypes,
        detailValuesByType,
      },
    });
  } catch (error) {
    console.error("Error getting detail structure:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy cấu trúc phân loại",
      error: error.message,
    });
  }
};
// Tạo danh mục mới
const createCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const detailCategories = req.body.detailCategories ? JSON.parse(req.body.detailCategories) : [];
    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên danh mục",
      });
    }

    let categoryImagePath = null;

    // Xử lý upload ảnh nếu có
    if (req.file) {
      categoryImagePath = `/uploads/categories/${req.file.filename}`;
    }

    // Tạo danh mục mới
    const newCategory = await Category.create({
      categoryName: categoryName,
      description: description || "",
      categoryImage: categoryImagePath,
    });

    // Xử lý chi tiết phân loại nếu có
    if (detailCategories && detailCategories.length > 0) {
      const detailsToCreate = detailCategories
        .filter((detail) => detail.detailType && detail.detailValue)
        .map((detail) => ({
          CategoryID: newCategory.categoryId,
          DetailType: detail.detailType,
          DetailValue: detail.detailValue,
        }));

      if (detailsToCreate.length > 0) {
        await DetailCategory.bulkCreate(detailsToCreate);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Tạo danh mục thành công",
      data: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    // Xóa file ảnh nếu có lỗi xảy ra
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo danh mục",
      error: error.message,
    });
  }
};

// Phương thức updateCategory
// Cập nhật phương thức updateCategory
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    // Trích xuất dữ liệu từ req.body
    const { categoryName, description } = req.body;
    console.log("Request body:", req.body);
    console.log("Request files:", req.file);

    // Xử lý chi tiết phân loại nếu có
    const detailCategories = req.body.detailCategories ? JSON.parse(req.body.detailCategories) : [];
    console.log("Detail categories:", detailCategories);

    // Kiểm tra dữ liệu đầu vào
    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên danh mục",
      });
    }

    // Tìm danh mục cần cập nhật
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Xử lý upload ảnh mới nếu có
    let categoryImagePath = category.categoryImage;
    if (req.file) {
      categoryImagePath = `/uploads/categories/${req.file.filename}`;

      // Xóa ảnh cũ nếu có
      if (category.categoryImage) {
        const oldImagePath = path.join(__dirname, "..", category.categoryImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Cập nhật danh mục
    await category.update({
      categoryName: categoryName,
      description: description || "",
      categoryImage: categoryImagePath,
    });

    // Xử lý cập nhật chi tiết phân loại
    if (detailCategories && detailCategories.length > 0) {
      // Lấy danh sách chi tiết phân loại hiện tại
      const existingDetails = await DetailCategory.findAll({
        where: { categoryId: categoryId },
      });

      // Phân loại các chi tiết để thêm mới, cập nhật hoặc xóa
      const detailsToUpdate = [];
      const detailsToCreate = [];

      // Xử lý từng chi tiết được gửi lên
      for (const detail of detailCategories) {
        // Bỏ qua các chi tiết không hợp lệ
        if (!detail.detailType || !detail.detailValue) continue;

        // Nếu có ID, đây là chi tiết cần cập nhật
        if (detail.id) {
          detailsToUpdate.push({
            id: detail.id,
            detailType: detail.detailType,
            detailValue: detail.detailValue,
          });
        } else {
          // Không có ID, đây là chi tiết mới
          detailsToCreate.push({
            categoryId: categoryId,
            DetailType: detail.detailType,
            DetailValue: detail.detailValue,
          });
        }
      }

      // Tạo danh sách ID của các chi tiết hiện tại
      const existingIds = existingDetails.map((detail) => detail.detailCategoryId);

      // Danh sách ID của các chi tiết được giữ lại (cập nhật)
      const updatedIds = detailsToUpdate.map((detail) => detail.id);

      // Danh sách ID của các chi tiết cần xóa (không có trong danh sách cập nhật)
      const detailsToDeleteIds = existingIds.filter((id) => !updatedIds.includes(id));

      // 1. Xóa các chi tiết không còn được sử dụng
      if (detailsToDeleteIds.length > 0) {
        await DetailCategory.destroy({
          where: {
            detailCategoryId: {
              [Op.in]: detailsToDeleteIds,
            },
          },
        });
        console.log(`Deleted ${detailsToDeleteIds.length} detail categories`);
      }

      // 2. Cập nhật các chi tiết hiện có
      for (const detail of detailsToUpdate) {
        await DetailCategory.update(
          {
            DetailType: detail.detailType,
            DetailValue: detail.detailValue,
          },
          {
            where: { detailCategoryId: detail.id },
          }
        );
      }
      console.log(`Updated ${detailsToUpdate.length} detail categories`);

      // 3. Thêm mới các chi tiết
      if (detailsToCreate.length > 0) {
        await DetailCategory.bulkCreate(detailsToCreate);
        console.log(`Created ${detailsToCreate.length} new detail categories`);
      }
    }

    // Lấy danh mục đã cập nhật với chi tiết mới
    const updatedCategory = await Category.findByPk(categoryId, {
      include: [
        {
          model: DetailCategory,
          as: "detailCategories",
          attributes: ["detailCategoryId", "detailType", "detailValue"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật danh mục thành công",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);

    // Xóa file ảnh mới nếu có lỗi xảy ra
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật danh mục",
      error: error.message,
    });
  }
};
// Xóa danh mục
// Sửa lại trong categoryController.js
const deleteCategory = async (req, res) => {
  try {
    console.log("Delete request params:", req.params);
    const categoryId = req.params.id || req.params.categoryId; // Hỗ trợ cả hai định dạng

    console.log(`Attempting to delete category with ID: ${categoryId}`);

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      console.log(`Category with ID ${categoryId} not found`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }
    // Xóa tất cả chi tiết phân loại trước
    const deletedDetails = await DetailCategory.destroy({
      where: { CategoryID: categoryId },
    });
    console.log(`Deleted ${deletedDetails} detail categories`);

    // Lưu lại đường dẫn ảnh để xóa sau
    const categoryImagePath = category.categoryImage;

    // Xóa danh mục
    await category.destroy();
    console.log(`Category with ID ${categoryId} deleted`);

    // Xóa file ảnh nếu có
    if (categoryImagePath) {
      try {
        // Xây dựng đường dẫn đầy đủ đến file ảnh
        // Loại bỏ dấu / ở đầu đường dẫn nếu có
        const cleanImagePath = categoryImagePath.startsWith("/")
          ? categoryImagePath.substring(1)
          : categoryImagePath;

        const filePath = path.join(__dirname, "..", cleanImagePath);
        console.log("Full image path to delete:", filePath);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted image file successfully at ${filePath}`);
        } else {
          const altFilePath = path.join(__dirname, "..", categoryImagePath);
          console.log("Alternative path to try:", altFilePath);

          if (fs.existsSync(altFilePath)) {
            fs.unlinkSync(altFilePath);
            console.log(`Deleted image file successfully at ${altFilePath}`);
          } else {
            console.log(`Image file not found at both paths`);
            console.log(`Original path: ${filePath}`);
            console.log(`Alternative path: ${altFilePath}`);
          }
        }
      } catch (fileError) {
        // Xử lý lỗi xóa file riêng biệt mà không ảnh hưởng đến API response
        console.error("Error deleting image file:", fileError);
      }
    } else {
      console.log("No image to delete");
    }
    return res.status(200).json({
      success: true,
      message: "Xóa danh mục thành công",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa danh mục",
      error: error.message,
    });
  }
};
// Thêm chi tiết danh mục
const addDetailCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { DetailType, DetailValue } = req.body;

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Kiểm tra chi tiết danh mục đã tồn tại chưa
    const existingDetail = await DetailCategory.findOne({
      where: {
        categoryId,
        DetailType,
        DetailValue,
      },
    });

    if (existingDetail) {
      return res.status(400).json({
        success: false,
        message: "Chi tiết danh mục này đã tồn tại",
      });
    }

    // Tạo chi tiết danh mục mới
    const newDetail = await DetailCategory.create({
      categoryId,
      DetailType,
      DetailValue,
    });

    return res.status(201).json({
      success: true,
      message: "Thêm chi tiết danh mục thành công",
      data: newDetail,
    });
  } catch (error) {
    console.error("Lỗi khi thêm chi tiết danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thêm chi tiết danh mục",
      error: error.message,
    });
  }
};

// Cập nhật chi tiết danh mục
// Cập nhật hàm updateDetailCategory
const updateDetailCategory = async (req, res) => {
  try {
    // Lấy ID từ URL
    const detailCategoryId = req.params.detailCategoryId || req.params.detailId;

    // Dữ liệu cập nhật
    const { DetailType, DetailValue } = req.body;

    console.log(`Updating detail category with ID: ${detailCategoryId}`);
    console.log("Update data:", { DetailType, DetailValue });

    // Kiểm tra dữ liệu đầu vào
    if (!DetailType || !DetailValue) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin chi tiết phân loại",
      });
    }

    // Tìm chi tiết cần cập nhật
    const detailCategory = await DetailCategory.findByPk(detailCategoryId);

    if (!detailCategory) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chi tiết phân loại để cập nhật",
      });
    }

    // Cập nhật chi tiết
    await detailCategory.update({
      DetailType,
      DetailValue,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật chi tiết phân loại thành công",
      data: detailCategory,
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
// Xóa chi tiết danh mục
const deleteDetailCategory = async (req, res) => {
  try {
    const { detailCategoryId } = req.params;

    const detailCategory = await DetailCategory.findByPk(detailCategoryId);
    if (!detailCategory) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chi tiết danh mục",
      });
    }

    // Xóa chi tiết danh mục
    await detailCategory.destroy();

    return res.status(200).json({
      success: true,
      message: "Xóa chi tiết danh mục thành công",
      data: {
        detailCategoryId,
      },
    });
  } catch (error) {
    console.error("Lỗi khi xóa chi tiết danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa chi tiết danh mục",
      error: error.message,
    });
  }
};

module.exports = {
  // Public APIs
  getAllCategories,
  getCategoryById,
  getProductsByCategory,
  getAllDetailCategories,
  getDetailCategoriesByType,
  getDistinctDetailTypesByCategory,
  getDetailStructureByCategoryId,
  // Admin APIs
  createCategory,
  updateCategory,
  deleteCategory,
  addDetailCategory,
  updateDetailCategory,
  deleteDetailCategory,
};
