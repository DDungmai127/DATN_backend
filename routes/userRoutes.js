const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, isAdmin } = require("../middlewares/authMiddleware");

// Routes cho admin
router.get("/", authenticate, isAdmin, userController.getUsers);
router.get("/:userId", authenticate, userController.getUserById);
router.put("/:userId", authenticate, userController.updateUser);
router.delete("/:userId", authenticate, isAdmin, userController.deleteUser);

module.exports = router;
