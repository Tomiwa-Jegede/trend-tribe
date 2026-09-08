// src/routes/payment.routes.js
const express = require("express");
const router = express.Router();
const { initPayment, verifyPayment, buyWithGigBalance } = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");
const { paymentLimiter } = require("../middleware/rateLimit");

router.post("/init", paymentLimiter, protect, initPayment);
router.post("/buy-with-gig", protect, buyWithGigBalance);
router.get("/verify", protect, verifyPayment);

module.exports = router;