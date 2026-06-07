const express = require("express");
const router = express.Router();
const { verifyPayment } = require("../controllers/paymentController");

router.post("/verify", verifyPayment);

module.exports = router;
