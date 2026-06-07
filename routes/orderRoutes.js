const express = require("express");
const router = express.Router();
const {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
} = require("../controllers/orderController");
const { protect, optionalProtect, admin } = require("../middleware/authMiddleware");

router.route("/").get(protect, admin, getOrders).post(optionalProtect, addOrderItems);
router.route("/myorders").get(protect, getMyOrders);
router.route("/:id").get(optionalProtect, getOrderById);
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered);

module.exports = router;
