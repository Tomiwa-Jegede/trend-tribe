const express = require("express");
const {
  register,
  login,
  getMe,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const {
  registerRules,
  loginRules,
  verifyEmailRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../validators/auth.validators");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── Public Routes ────────────────────────────────────────────
router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/forgot-password", forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, resetPassword);

// ─── Protected Routes ─────────────────────────────────────────
router.get("/me", protect, getMe);
router.post("/verify-email", protect, verifyEmailRules, validate, verifyEmail);
router.post("/resend-otp", protect, resendOtp);

module.exports = router;
