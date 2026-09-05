const express = require("express");
const {
  register,
  login,
  getMe,
  verifyEmail,
  verifyRegistration,
  resendRegistrationOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  updateProfile,
  requestSellerUpgrade,
  verifySellerUpgrade,
  unsubscribe,

} = require("../controllers/auth.controller");
const {
  registerRules,
  loginRules,
  verifyEmailRules,
  verifyRegistrationRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../validators/auth.validators");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");
const { authLimiter, otpLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────
router.post("/register", authLimiter, registerRules, validate, register);
router.post("/verify-registration", otpLimiter, verifyRegistrationRules, validate, verifyRegistration);
router.post("/register/resend", otpLimiter, resendRegistrationOtp);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/forgot-password", authLimiter, forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordRules, validate, resetPassword);
router.get("/unsubscribe/:token", unsubscribe);
// ─── Protected ────────────────────────────────────────────────
router.get("/me", protect, getMe);
router.post("/verify-email", otpLimiter, protect, verifyEmailRules, validate, verifyEmail);
router.post("/resend-otp", otpLimiter, protect, resendOtp);
router.patch("/profile", protect, uploadAvatar.single("avatar"), updateProfile);
router.post("/upgrade-to-seller", otpLimiter, protect, requestSellerUpgrade);
router.post("/upgrade-to-seller/verify", otpLimiter, protect, verifySellerUpgrade);


module.exports = router;
