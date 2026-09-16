const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getMyReferral, getMyCommissions, updateMyReferralCode } = require("../controllers/referral.controller");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/me", protect, getMyReferral);
router.get("/commissions", protect, getMyCommissions);
router.patch("/code", protect, authLimiter, updateMyReferralCode);

module.exports = router;
