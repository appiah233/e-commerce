const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (supports guest and logged-in user checkout)
const addOrderItems = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, guestEmail } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ status: "error", message: "No order items provided" });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country) {
      return res.status(400).json({ status: "error", message: "Shipping address is incomplete" });
    }

    const verifiedOrderItems = [];
    let calculatedTotalPrice = 0;

    for (const item of orderItems) {
      const dbProduct = await Product.findById(item.product);

      if (!dbProduct) {
        return res.status(404).json({ status: "error", message: `Product ${item.name} not found` });
      }

      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({
          status: "error",
          message: `Insufficient stock for product: ${dbProduct.name}. Only ${dbProduct.stock} left.`,
        });
      }

      calculatedTotalPrice += dbProduct.price * item.quantity;
      verifiedOrderItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        quantity: item.quantity,
        price: dbProduct.price,
      });
    }

    const order = new Order({
      orderItems: verifiedOrderItems,
      user: req.user ? req.user._id : undefined,
      guestEmail: req.user ? req.user.email : guestEmail,
      shippingAddress,
      paymentMethod: paymentMethod || "Paystack",
      totalPrice: calculatedTotalPrice,
    });

    const createdOrder = await order.save();

    return res.status(201).json({ status: "success", data: createdOrder });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public (with basic validation to verify ownership/email matching)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("orderItems.product", "name price category image");

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    if (req.user && order.user && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: "error", message: "Not authorized to view this order" });
    }

    if (!req.user && req.query.email && order.guestEmail !== req.query.email) {
      return res.status(403).json({ status: "error", message: "Guest email does not match order" });
    }

    return res.json({ status: "success", data: order });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ status: "success", data: orders });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Get all orders (admin only)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    return res.json({ status: "success", data: orders });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// @desc    Mark order as delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    if (!order.isPaid) {
      return res.status(400).json({ status: "error", message: "Order must be paid before delivery" });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    return res.json({ status: "success", data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  addOrderItems,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
};
