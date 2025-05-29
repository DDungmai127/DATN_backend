const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

// Lấy danh sách tồn kho (có phân trang, lọc và tìm kiếm)
router.get("/", inventoryController.getAllInventory);

// Lấy thống kê tồn kho
router.get("/statistics", inventoryController.getInventoryStatistics);

// Xuất báo cáo tồn kho
router.get("/report", authenticate, inventoryController.exportInventoryReport);

// Lấy thông tin chi tiết một mục tồn kho
router.get("/:storeId/:productId", inventoryController.getInventoryItem);

// Thêm sản phẩm vào kho
router.post("/", authenticate, isAdmin, inventoryController.addInventoryItem);

// Cập nhật thông tin tồn kho
router.put("/:storeId/:productId", authenticate, isAdmin, inventoryController.updateInventoryItem);

// Xóa sản phẩm khỏi kho
router.delete(
  "/:storeId/:productId",
  authenticate,
  isAdmin,
  inventoryController.deleteInventoryItem
);

// Nhận thêm sản phẩm vào kho
router.post(
  "/:storeId/:productId/receive",
  authenticate,
  isAdmin,
  inventoryController.receiveInventory
);

// Chuyển sản phẩm giữa các kho
router.post("/transfer", authenticate, isAdmin, inventoryController.transferInventory);

module.exports = router;
