const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");
const { uploadProduct, handleUploadError } = require("../middlewares/uploadMiddleware");

// Các route cụ thể đặt trước
router.get("/", productController.getProducts);
router.get("/search", productController.searchProducts);
router.get("/filter", productController.getProductsByDetailCategories);
// GET: Lấy sản phẩm theo danh mục - Đặt lên trước các dynamic routes
router.get("/category/:categoryId", productController.getProductsByCategory);

// APIs xử lý chi tiết danh mục sản phẩm
router.get(
  "/:productId/details",
  authenticate,
  isAdmin,
  productController.getProductDetailCategories
);
router.post(
  "/add-detailscatprod",
  authenticate,
  isAdmin,
  productController.addDetailCategoryProduct
);
router.delete("/:productId/details", productController.deleteProductDetailCategories);

// APIs CRUD sản phẩm
router.post(
  "/",
  authenticate,
  isAdmin,
  uploadProduct,
  handleUploadError,
  productController.createProduct
);
router.put("/:id", authenticate, isAdmin, uploadProduct, productController.updateProduct);
router.delete("/:id", authenticate, isAdmin, productController.deleteProduct);

// Đặt route lấy sản phẩm theo ID cuối cùng vì nó catch tất cả các paths
router.get("/:id", productController.getProductById);

module.exports = router;
