const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Verify Paystack transaction reference
// @route   POST /api/payment/verify
// @access  Public
const verifyPayment = async (req, res) => {
  try {
    const { reference, orderId } = req.body;

    if (!reference || !orderId) {
      return res.status(400).json({ status: "error", message: "Transaction reference and Order ID are required" });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    if (order.isPaid) {
      return res.status(400).json({ status: "error", message: "Order has already been marked as paid" });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    // Fallback for demo/development mode when no API key is configured
    if (!secretKey || secretKey === "placeholder" || secretKey.startsWith("sk_test_placeholder")) {
      console.warn("⚠️ Paystack Secret Key not set or is placeholder. Falling back to Demo Mode payment verification.");

      // Complete order under Mock verification
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: "demo_" + Date.now(),
        status: "success",
        update_time: new Date().toISOString(),
        email_address: order.guestEmail || "demo@emyafrobeads.com",
      };

      await order.save();

      // Decrement inventory stock
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          await product.save();
        }
      }

      return res.status(200).json({
        status: "success",
        message: "Payment verified successfully (Demo Mode)",
        data: order
      });
    }

    // Real Paystack verification (Server-to-Server)
    const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    const response = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const verifyData = await response.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return res.status(400).json({
        status: "error",
        message: verifyData.message || "Payment verification failed"
      });
    }

    const paystackData = verifyData.data;

    // Security check: Verify currency matches
    if (paystackData.currency !== "GHS") {
      return res.status(400).json({
        status: "error",
        message: `Currency mismatch. Expected GHS, got ${paystackData.currency}`
      });
    }

    // Security check: Verify amount matches (Paystack operates in pesewas/kobo, so divide by 100)
    const amountPaidGHS = paystackData.amount / 100;
    if (Math.abs(amountPaidGHS - order.totalPrice) > 0.01) {
      return res.status(400).json({
        status: "error",
        message: `Amount mismatch. Expected ${order.totalPrice} GHS, got ${amountPaidGHS} GHS`
      });
    }

    // Update order status in database
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: paystackData.id.toString(),
      status: paystackData.status,
      update_time: paystackData.paid_at,
      email_address: paystackData.customer.email,
    };

    await order.save();

    // Decrement stock levels for products
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Payment successfully verified and stock levels updated.",
      data: order
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  verifyPayment,
};
