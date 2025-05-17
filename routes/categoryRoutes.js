const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");
const detailCategoryController = require("../controllers/detailCategoryController");
const { uploadCategory } = require("../middlewares/uploadMiddleware");
/**
 * @route   GET /api/categories
 * @desc    Lấy tất cả danh mục
 * @access  Public
 */
router.get("/", categoryController.getAllCategories);

/**
 * @route   GET /api/categories/:categoryId
 * @desc    Lấy chi tiết danh mục theo ID
 * @access  Public
 */
router.get("/:categoryId", categoryController.getCategoryById);

/**
 * @route   GET /api/categories/:categoryId/products
 * @desc    Lấy sản phẩm theo danh mục
 * @access  Public
 */
router.get("/:categoryId/products", categoryController.getProductsByCategory);

// Chi tiết danh mục - thêm route mới này
router.get("/:categoryId/details", detailCategoryController.getDetailsByCategory);

router.get("/structure/:categoryId", categoryController.getDetailStructureByCategoryId);
/**
/**
 * @route   GET /api/categories/details/all
 * @desc    Lấy tất cả chi tiết danh mục
 * @access  Public
 */
router.get("/details/all", categoryController.getAllDetailCategories);

// :ấy chi mục của detailType
router.get("/:categoryId/detail-types", categoryController.getDistinctDetailTypesByCategory);
/**
 * @route   GET /api/categories/:categoryId/detail-types/:detailType
 * @desc    Lấy chi tiết danh mục theo loại và danh mục
 * @access  Public
 */
router.get("/:categoryId/detail-types/:detailType", categoryController.getDetailCategoriesByType);

// ==== ADMIN ROUTES ====

/**
 * @route   POST /api/categories
 * @desc    Tạo danh mục chính mới
 * @access  Private/Admin
 */
router.post("/", authenticate, isAdmin, uploadCategory, categoryController.createCategory);

/**
 * @route   PUT /api/categories/:categoryId
 * @desc    Cập nhật danh mục chính
 * @access  Private/Admin
 */
router.put(
  "/:categoryId",
  authenticate,
  isAdmin,
  uploadCategory,
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/categories/:categoryId
 * @desc    Xóa danh mục
 * @access  Private/Admin
 */
router.delete("/:categoryId", authenticate, isAdmin, categoryController.deleteCategory);

/**
 * @route   POST /api/categories/:categoryId/details
 * @desc    Thêm chi tiết danh mục
 * @access  Private/Admin
 */
router.post("/:categoryId/details", authenticate, isAdmin, categoryController.addDetailCategory);

/**
 * @route   PUT /api/categories/details/:detailCategoryId
 * @desc    Cập nhật chi tiết danh mục
 * @access  Private/Admin
 */
router.put(
  "/:categoryId/details/:detailId",
  authenticate,
  isAdmin,
  categoryController.updateDetailCategory
);
/**
 * @route   DELETE /api/categories/details/:detailCategoryId
 * @desc    Xóa chi tiết danh mục
 * @access  Private/Admin
 */
router.delete(
  "/details/:detailCategoryId",
  authenticate,
  isAdmin,
  categoryController.deleteDetailCategory
);

module.exports = router;
