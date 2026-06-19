// src/controllers/auth.controller.js

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../db");
const { signToken } = require("../utils/jwt");
const { generateOTP, getOTPExpiry } = require("../utils/otp");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/email");
const config = require("../config/env");

// ─── Helper: strip sensitive fields from user object ──────────
const sanitizeUser = (user) => {
  const {
    password,
    otpCode,
    otpExpiresAt,
    resetToken,
    resetTokenExpiresAt,
    ...safeUser
  } = user;
  return safeUser;
};

// ─── Helper: build token payload ─────────────────────────────
const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, username, password, fullName, school, matricNumber, bio } =
      req.body;

    if (!school || !school.trim()) {
      return res.status(400).json({ error: "School is required" });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(409).json({ error: "This username is already taken" });
    }

    if (matricNumber && matricNumber.trim()) {
      const existingMatric = await prisma.user.findUnique({
        where: { matricNumber: matricNumber.trim() },
      });
      if (existingMatric) {
        return res
          .status(409)
          .json({ error: "This matric number is already registered" });
      }
    }
    await prisma.pendingRegistration.deleteMany({
      where: { otpExpiresAt: { lt: new Date() } },
    });

    const hashedPassword = await bcrypt.hash(password, 12);
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiry();
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        username,
        password: hashedPassword,
        fullName,
        school: school.trim(),
        matricNumber: matricNumber ? matricNumber.trim() : null,
        bio: bio || null,
        otpCode,
        otpExpiresAt,
      },
      create: {
        email,
        username,
        password: hashedPassword,
        fullName,
        school: school.trim(),
        matricNumber: matricNumber ? matricNumber.trim() : null,
        bio: bio || null,
        otpCode,
        otpExpiresAt,
      },
    });

    try {
      await sendOTPEmail(email, fullName, otpCode);
    } catch (emailErr) {
      console.error("[REGISTER → SEND OTP EMAIL ERROR]", emailErr);
      return res.status(502).json({
        error:
          "Account details saved but we couldn't send the verification email. Please try again.",
      });
    }

    return res.status(201).json({
      message: "Check your email for a 6-digit verification code.",
    });
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "An account with those details already exists" });
    }
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again shortly.",
      });
    }
    return res.status(500).json({
      error:
        "Something went wrong while creating your account. Please try again.",
    });
  }
};

const verifyRegistration = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email },
    });
    if (!pending) {
      return res.status(404).json({
        error:
          "No pending registration found for this email. Please register again.",
      });
    }

    if (new Date() > pending.otpExpiresAt) {
      await prisma.pendingRegistration.delete({ where: { email } });
      return res.status(400).json({
        error: "Verification code has expired. Please register again.",
      });
    }

    if (otp !== pending.otpCode) {
      return res.status(400).json({ error: "Incorrect verification code" });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: pending.email },
    });
    if (existingEmail) {
      await prisma.pendingRegistration.delete({ where: { email } });
      return res.status(409).json({
        error: "An account with this email already exists. Please log in.",
      });
    }

    await prisma.user.create({
      data: {
        email: pending.email,
        username: pending.username,
        password: pending.password,
        fullName: pending.fullName,
        school: pending.school,
        matricNumber: pending.matricNumber,
        bio: pending.bio,
        isVerified: true,
      },
    });

    await prisma.pendingRegistration.delete({ where: { email } });

    return res.status(200).json({
      message: "Email verified successfully ✅ You can now log in.",
    });
  } catch (err) {
    console.error("[VERIFY REGISTRATION ERROR]", err);
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "An account with those details already exists. Please log in.",
      });
    }
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid username/email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid username/email or password",
      });
    }

    const token = signToken(buildTokenPayload(user));

    return res.status(200).json({
      message: "Login successful ✅",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me ← PROTECTED
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        school: true,
        matricNumber: true,
        bio: true,
        avatar: true,
        whatsapp: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        listings: { select: { id: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { listings, ...userFields } = user;

    return res.status(200).json({
      user: { ...userFields, listingCount: listings.length },
    });
  } catch (err) {
    console.error("[GET ME ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-email ← PROTECTED
// Body: { otp }
// ─────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({
        error: "No verification code found. Please request a new one.",
      });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        error: "Verification code has expired. Please request a new one.",
      });
    }

    if (otp !== user.otpCode) {
      return res.status(400).json({ error: "Incorrect verification code" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    return res.status(200).json({
      message: "Email verified successfully ✅",
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error("[VERIFY EMAIL ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp ← PROTECTED
// ─────────────────────────────────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt },
    });

    await sendOTPEmail(user.email, user.fullName, otpCode);

    return res.status(200).json({
      message: "A new verification code has been sent to your email ✅",
    });
  } catch (err) {
    console.error("[RESEND OTP ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password ← PUBLIC
// Body: { email }  — always returns a generic message (no email enumeration)
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const genericResponse = {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    try {
      console.log("[DEBUG] Attempting to send reset email to:", user.email);
      console.log("[DEBUG] Using EMAIL_FROM:", config.email.from);
      const result = await sendPasswordResetEmail(
        user.email,
        user.fullName,
        resetUrl,
      );
      console.log(
        "[DEBUG] Brevo send result:",
        JSON.stringify(result, null, 2),
      );
    } catch (emailErr) {
      console.error(
        "[FORGOT PASSWORD → SEND EMAIL ERROR] message:",
        emailErr.message,
      );
      console.error(
        "[FORGOT PASSWORD → SEND EMAIL ERROR] statusCode:",
        emailErr.statusCode,
      );
      console.error(
        "[FORGOT PASSWORD → SEND EMAIL ERROR] body:",
        JSON.stringify(emailErr.body, null, 2),
      );
      console.error("[FORGOT PASSWORD → SEND EMAIL ERROR] full:", emailErr);
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("[FORGOT PASSWORD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password ← PUBLIC
// Body: { token, newPassword }
// ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      new Date() > user.resetTokenExpiresAt
    ) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return res.status(200).json({
      message: "Password reset successfully ✅ You can now log in.",
    });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ─────────────────────────────────────────────────────────────
// PATCH /api/auth/profile ← PROTECTED
// Handles avatar upload + profile field updates
// ─────────────────────────────────────────────────────────────
// PATCH /api/auth/profile ← PROTECTED
// Handles avatar upload + profile field updates
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, school, whatsapp } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (school !== undefined) updateData.school = school;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

    // If multer + cloudinary processed an avatar file, use its URL
    if (req.file) {
      // Delete old avatar from Cloudinary if one exists
      const existing = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { avatarPublicId: true },
      });
      if (existing?.avatarPublicId) {
        const cloudinary = require("../config/cloudinary");
        await cloudinary.uploader
          .destroy(existing.avatarPublicId)
          .catch(() => {});
      }
      updateData.avatar = req.file.path;
      updateData.avatarPublicId = req.file.filename;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    return res.status(200).json({
      message: "Profile updated successfully ✅",
      user: sanitizeUser(updated),
    });
  } catch (err) {
    console.error("[UPDATE PROFILE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  verifyRegistration,
  resendOtp,
  forgotPassword,
  resetPassword,
  updateProfile,
};
