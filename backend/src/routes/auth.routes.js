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

const router = express.Router();

// ─── Public ───────────────────────────────────────────────────
router.post("/register", registerRules, validate, register);
router.post("/verify-registration", verifyRegistrationRules, validate, verifyRegistration);
router.post("/register/resend", resendRegistrationOtp);
router.post("/login", loginRules, validate, login);
router.post("/forgot-password", forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, resetPassword);

// ─── Protected ────────────────────────────────────────────────
router.get("/me", protect, getMe);
router.post("/verify-email", protect, verifyEmailRules, validate, verifyEmail);
router.post("/resend-otp", protect, resendOtp);
router.patch("/profile", protect, uploadAvatar.single("avatar"), updateProfile);
router.post("/upgrade-to-seller", protect, requestSellerUpgrade);
router.post("/upgrade-to-seller/verify", protect, verifySellerUpgrade);

module.exports = router;
