const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

// Route công khai (không cần đăng nhập)
router.post("/", orderController.createOrder); // Tạo đơn hàng mới
router.get("/phone/:phoneNumber", orderController.getOrdersByPhoneNumber); // Lấy đơn hàng theo số điện thoại
// Thêm endpoint mới
router.get("/statistics/revenue", authenticate, orderController.getRevenueStatistics);
// Route admin - đặt trước các route khác có biến
router.get("/all", authenticate, isAdmin, orderController.getAllOrders); // Lấy tất cả đơn hàng (admin)
router.put("/:orderId/status", authenticate, isAdmin, orderController.updateOrderStatus); // Cập nhật trạng thái

router.get("/store/:storeId", authenticate, orderController.getOrdersByStore);
// Route yêu cầu đăng nhập - đặt sau các route cụ thể hơn
router.get("/user", authenticate, orderController.getUserOrders); // Lấy đơn hàng của user
router.get("/:orderId", authenticate, orderController.getOrderDetail); // Xem chi tiết đơn hàng

router.delete("/:orderId", authenticate, isAdmin, orderController.deleteOrder);
router.put("/:orderId/cancel", authenticate, orderController.cancelOrder); // Hủy đơn hàng

module.exports = router;
