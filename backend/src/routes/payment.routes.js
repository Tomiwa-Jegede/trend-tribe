// src/routes/payment.routes.js
const express = require("express");
const router = express.Router();
const { initPayment, verifyPayment } = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");
const { paymentLimiter } = require("../middleware/rateLimit");

router.post("/init", paymentLimiter, protect, initPayment);
router.get("/verify", protect, verifyPayment);

module.exports = router;