const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

// Lấy danh sách cửa hàng (có phân trang và tìm kiếm)
router.get("/", storeController.getAllStores);

// Lấy danh sách cửa hàng gần vị trí
router.get("/nearby", storeController.getNearbyStores);

// Lấy thông tin chi tiết một cửa hàng
router.get("/:storeId", storeController.getStoreById);

// Lấy danh sách sản phẩm của cửa hàng
router.get("/:storeId/products", storeController.getStoreProducts);

// Lấy thống kê tồn kho của cửa hàng
router.get("/:storeId/inventory-stats", storeController.getStoreInventoryStats);

// Các tác vụ quản trị (yêu cầu quyền admin)
// Tạo cửa hàng mới
router.post("/", authenticate, isAdmin, storeController.createStore);

// Cập nhật thông tin cửa hàng
router.put("/:storeId", authenticate, isAdmin, storeController.updateStore);

// Cập nhật trạng thái cửa hàng
router.patch("/:storeId/status", authenticate, isAdmin, storeController.updateStoreStatus);

// Xóa cửa hàng
router.delete("/:storeId", authenticate, isAdmin, storeController.deleteStore);

module.exports = router;
