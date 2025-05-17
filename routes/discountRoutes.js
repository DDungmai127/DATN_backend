const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discountController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

// Routes chỉ dành cho admin
router.post("/", authenticate, isAdmin, discountController.createDiscount);
router.get("/", authenticate, isAdmin, discountController.getDiscounts);
router.get("/active", authenticate, discountController.getActiveDiscounts);
router.get("/:discountId", authenticate, discountController.getDiscountById);
router.put("/:discountId", authenticate, isAdmin, discountController.updateDiscount);
router.delete("/:discountId", authenticate, isAdmin, discountController.deleteDiscount);
router.post("/apply", authenticate, isAdmin, discountController.applyDiscountToProduct);
router.post("/remove", authenticate, isAdmin, discountController.removeDiscountFromProduct);

module.exports = router;
