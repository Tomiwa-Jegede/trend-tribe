// src/controllers/auth.controller.js

// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../db");
const { signToken } = require("../utils/jwt");
const { generateOTP, getOTPExpiry } = require("../utils/otp");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/email");
const config = require("../config/env");
const { normalizeWhatsapp } = require("../utils/phone");
const { generateUniqueUserSlug } = require("../utils/slug");
const { verifyJamb } = require("../utils/jamb");
// ─── Helper: generate unique 10-digit gig account number (809...) ──
const generateGigAccountNumber = async () => {
  for (let i = 0; i < 10; i++) {
    const num = "80" + Math.floor(10000000 + Math.random() * 90000000).toString() + Math.floor(10 + Math.random() * 90).toString();
    const acc = num.slice(0, 10);
    const exists = await prisma.user.findUnique({ where: { gigAccountNumber: acc } });
    if (!exists) return acc;
  }
  return "80" + Date.now().toString().slice(-8);
};

// ─── Helper: strip sensitive fields from user object ──────────
const sanitizeUser = (user) => {
  const {
    password,
    otpCode,
    otpExpiresAt,
    resetToken,
    resetTokenExpiresAt,
    gigTransferPin,
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
    const { email, username, password, fullName, school, matricNumber, whatsapp, bio, role, referralCode: referralCodeRaw, isFresher: rawIsFresher, jambRegNumber, jambExamYear } =
      req.body;

    const isFresher = rawIsFresher === true || rawIsFresher === "true";
    const accountRole = role === "SELLER" ? "SELLER" : "BUYER";

    if (accountRole === "SELLER") {
      if (!school || !school.trim()) {
        return res.status(400).json({ error: "School is required for seller accounts" });
      }
      if (!whatsapp || !whatsapp.trim()) {
        return res.status(400).json({ error: "WhatsApp number is required for seller accounts" });
      }
      if (isFresher) {
        const reg = String(jambRegNumber || "").trim().toUpperCase();
        const year = parseInt(jambExamYear, 10);
        const currentYear = new Date().getFullYear();
        if (!/^\d{12}[A-Z]{2}$/.test(reg)) {
          return res.status(400).json({ error: "12 digits + 2 letters, e.g. 202441390932IF" });
        }
        if (!year || year < currentYear - 1 || year > currentYear) {
          return res.status(400).json({ error: `Year must be ${currentYear - 1} or ${currentYear}` });
        }
        // JAMB live check — only Redeemers University passes
        try {
          const jambRes = await verifyJamb({ regNumber: reg, examYear: year });
          if (!jambRes.isRun) {
            return res.status(400).json({ error: "Not for Redeemer's — check number/year" });
          }
        } catch (jambErr) {
          if (jambErr.status === 503) return res.status(503).json({ error: "Can't confirm Jamb Registration now try again later" });
          if (jambErr.status === 400) return res.status(400).json({ error: jambErr.message });
          return res.status(503).json({ error: "Can't confirm Jamb Registration now try again later" });
        }
      } else {
        if (!email.endsWith("@run.edu.ng")) {
          return res.status(400).json({ error: "Sellers must use a valid RUN school email (@run.edu.ng)" });
        }
        if (!matricNumber || !matricNumber.trim()) {
          return res.status(400).json({ error: "Matric number is required for seller accounts" });
        }
      }
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

    if (!isFresher && matricNumber && matricNumber.trim()) {
      const existingMatric = await prisma.user.findUnique({
        where: { matricNumber: matricNumber.trim() },
      });
      if (existingMatric) {
        return res
          .status(409)
          .json({ error: "This matric number is already registered" });
      }
    }
    if (isFresher && accountRole === "SELLER") {
      const reg = String(jambRegNumber || "").trim().toUpperCase();
      const year = parseInt(jambExamYear, 10);
      const existingJamb = await prisma.user.findFirst({
        where: { jambRegNumber: reg, jambExamYear: year },
      });
      if (existingJamb) {
        return res.status(409).json({ error: "Already registered" });
      }
      const pendingJamb = await prisma.pendingRegistration.findFirst({
        where: { jambRegNumber: reg, jambExamYear: year },
      });
      if (pendingJamb) {
        return res.status(409).json({ error: "Already pending — check email" });
      }
    }
    await prisma.pendingRegistration.deleteMany({
      where: { otpExpiresAt: { lt: new Date() } },
    });

    let normalizedReferralCode = null;
    if (referralCodeRaw) {
      const { normalizeReferralCode, resolveReferralCode } = require("../utils/referral");
      normalizedReferralCode = normalizeReferralCode(referralCodeRaw);
      if (!normalizedReferralCode) return res.status(400).json({ error: "Invalid referral code" });
      const referrer = await resolveReferralCode(normalizedReferralCode);
      if (!referrer) return res.status(400).json({ error: "Invalid referral code" });
      if (referrer.email.toLowerCase() === email.toLowerCase()) return res.status(400).json({ error: "You cannot refer yourself" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiry();
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        username,
        password: hashedPassword,
        fullName,
        school: school ? school.trim() : "",
        matricNumber: isFresher ? null : (matricNumber ? matricNumber.trim() : null),
        isFresher,
        jambRegNumber: isFresher ? String(jambRegNumber || "").trim().toUpperCase() : null,
        jambExamYear: isFresher ? parseInt(jambExamYear, 10) : null,
        whatsapp: whatsapp ? whatsapp.trim() : null,
        bio: bio || null,
        role: accountRole,
        otpCode,
        otpExpiresAt,
        referralCode: normalizedReferralCode,
      },
      create: {
        email,
        username,
        password: hashedPassword,
        fullName,
        school: school ? school.trim() : "",
        matricNumber: isFresher ? null : (matricNumber ? matricNumber.trim() : null),
        isFresher,
        jambRegNumber: isFresher ? String(jambRegNumber || "").trim().toUpperCase() : null,
        jambExamYear: isFresher ? parseInt(jambExamYear, 10) : null,
        whatsapp: whatsapp ? whatsapp.trim() : null,
        bio: bio || null,
        role: accountRole,
        otpCode,
        otpExpiresAt,
        referralCode: normalizedReferralCode,
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

const resendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      return res.status(404).json({ error: "No pending registration found. Please register again." });
    }
    // 60s cooldown — derive last send time from otpExpiresAt (10m window)
    const lastSentAt = new Date(pending.otpExpiresAt).getTime() - 10 * 60 * 1000;
    if (Date.now() - lastSentAt < 60 * 1000) {
      return res.status(429).json({ error: "Please wait 60s before requesting another code" });
    }
    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiry();
    await prisma.pendingRegistration.update({
      where: { email },
      data: { otpCode, otpExpiresAt },
    });
    await sendOTPEmail(email, pending.fullName, otpCode);
    return res.status(200).json({ message: "A new verification code has been sent to your email." });
  } catch (err) {
    console.error("[RESEND REGISTRATION OTP ERROR]", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};

const verifyRegistration = async (req, res) => {
  try {
    const { email, otp, referralCode: referralCodeBodyRaw } = req.body;

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

    const slug = await generateUniqueUserSlug(prisma, pending.username);
    const gigAccountNumber = await generateGigAccountNumber();
    const { normalizeReferralCode, resolveReferralCode, generateReferralCode } = require("../utils/referral");
    let referrer = null;
    const referralCodeToResolve = normalizeReferralCode(referralCodeBodyRaw) || pending.referralCode;
    if (referralCodeToResolve) {
      const norm = normalizeReferralCode(referralCodeToResolve);
      if (norm) {
        referrer = await resolveReferralCode(norm);
        if (referralCodeBodyRaw && !referrer) return res.status(400).json({ error: "Invalid referral code" });
        if (referrer && referrer.email.toLowerCase() === pending.email.toLowerCase()) return res.status(400).json({ error: "You cannot refer yourself" });
        if (referrer) {
          const existingReferral = await prisma.referral.findUnique({ where: { referredId: referrer.id } }).catch(() => null);
          void existingReferral;
        }
      }
    }
    const referralCodeForNewUser = await generateReferralCode();
    const commissionEndAt = new Date();
    commissionEndAt.setMonth(commissionEndAt.getMonth() + config.referral.durationMonths);
    const fresherExpiresAt = pending.isFresher ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null;
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          slug,
          email: pending.email,
          username: pending.username,
          password: pending.password,
          fullName: pending.fullName,
          school: pending.school,
          matricNumber: pending.matricNumber,
          isFresher: pending.isFresher || false,
          jambRegNumber: pending.jambRegNumber || null,
          jambExamYear: pending.jambExamYear || null,
          fresherExpiresAt,
          whatsapp: pending.whatsapp ? normalizeWhatsapp(pending.whatsapp) : null,
          bio: pending.bio,
          role: pending.role,
          isVerified: true,
          gigAccountNumber,
          referralCode: referralCodeForNewUser,
        },
      });
      if (referrer) {
        try {
          await tx.referral.create({
            data: {
              referrerId: referrer.id,
              referredId: user.id,
              referralCode: referrer.referralCode,
              commissionStartAt: new Date(),
              commissionEndAt,
              status: "ACTIVE",
            },
          });
          await tx.notification.create({ data: { userId: referrer.id, actorId: user.id, type: "REFERRAL_NEW_USER" } }).catch(() => {});
        } catch (e) {
          if (e.code !== "P2002") throw e;
        }
      }
      await tx.pendingRegistration.delete({ where: { email } }).catch(() => {});
      return user;
    });
    if (referrer) {
      try {
        const { sendPushToUser } = require("../utils/push");
        const { emitNotification } = require("../realtime");
        sendPushToUser(prisma, referrer.id, { title: "You referred a new user", body: `@${pending.username} just signed up with your referral`, url: "/referrals", tag: `referral-new-${newUser.id}` }).catch(() => {});
        emitNotification(referrer.id, { type: "REFERRAL_NEW_USER" });
      } catch {}
    }

    // Admin bell: new user signed up (Wayfinder admin signal) + push
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({ userId: a.id, actorId: newUser.id, type: "NEW_USER" })),
        });
        try {
          const { emitNotification } = require("../realtime");
          const { sendPushToUser } = require("../utils/push");
          for (const a of admins) {
            emitNotification(a.id, { type: "NEW_USER", actorId: newUser.id });
            prisma.notification.count({ where: { userId: a.id, read: false } }).then((unread) => {
              sendPushToUser(prisma, a.id, {
                title: "Trend Tribe — New user",
                body: `${newUser.username} just joined (${newUser.school || "campus"})`,
                url: "/admin/users",
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                badgeCount: unread,
                tag: `new-user-${newUser.id}`,
              }).catch(() => {});
            }).catch(() => {});
          }
        } catch {}
      }
    } catch (e) {
      console.error("[ADMIN NOTIF NEW_USER ERROR]", e.message);
    }

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
    if (typeof identifier !== "string") return res.status(400).json({ error: "Email or username must be text" });

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
    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        slug: true,
        email: true,
        username: true,
        fullName: true,
        school: true,
        matricNumber: true,
        isFresher: true,
        jambRegNumber: true,
        jambExamYear: true,
        fresherExpiresAt: true,
        bio: true,
        avatar: true,
        whatsapp: true,
        isVerified: true,
        role: true,
        tokenBalance: true,
        gigBalance: true,
        referralCode: true,
        muteTaskPush: true,
        aiUsesRemaining: true,
        numberViewsRemaining: true,
        createdAt: true,
        updatedAt: true,
        listings: { select: { id: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.referralCode) {
      try {
        const { generateReferralCode } = require("../utils/referral");
        const code = await generateReferralCode();
        const updated = await prisma.user.updateMany({ where: { id: user.id, referralCode: null }, data: { referralCode: code } });
        if (updated.count === 1) user.referralCode = code;
        else {
          const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } });
          if (fresh?.referralCode) user.referralCode = fresh.referralCode;
        }
      } catch {}
    }

     const { listings, ...userFields } = user;
    return res.status(200).json({
      user: {
        ...userFields,
        listingCount: listings.length,
      },
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

    if (user.otpExpiresAt) {
      const lastSentAt = new Date(user.otpExpiresAt).getTime() - 10 * 60 * 1000;
      if (Date.now() - lastSentAt < 60 * 1000) {
        return res.status(429).json({ error: "Please wait 60s before requesting another code" });
      }
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
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiresAt },
    });

    // Use canonical clientUrl (single, not comma-separated) — fixed for email links
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    if (config.isDev) console.log(`[FORGOT PASSWORD] resetUrl for ${user.email}: ${resetUrl}`);
    try {
      await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
    } catch (emailErr) {
      console.error("[FORGOT PASSWORD → SEND EMAIL ERROR]", emailErr.message, emailErr.response?.data || emailErr.body || "");
      // In development, surface the reset URL so the flow can be tested without a working email provider
      if (config.isDev) {
        return res.status(200).json({ ...genericResponse, _devResetUrl: resetUrl, _devNote: "Email failed, use _devResetUrl for testing" });
      }
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
    if (!token || typeof token !== "string") return res.status(400).json({ error: "Reset token required" });
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findUnique({ where: { resetToken: hashed } });
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
    if (whatsapp !== undefined) {
      if (!whatsapp || !whatsapp.trim()) {
        updateData.whatsapp = null;
      } else {
        const normalized = normalizeWhatsapp(whatsapp);
        if (!normalized) {
          return res.status(400).json({
            error: "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)",
          });
        }
        updateData.whatsapp = normalized;
      }
    }

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

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/me/matric  (also mounted as PATCH /api/auth/add-matric)
// Fresher adds matric + school email after getting it (one-way, within 3 months)
// ─────────────────────────────────────────────────────────────
const addMatricNumber = async (req, res) => {
  try {
    const { matricNumber, schoolEmail } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.isFresher || user.matricNumber) {
      return res.status(400).json({ error: "Matric number update is not available for this account" });
    }
    // 3-month window check (if expired, still allow upgrade but block selling until done)
    // We allow the update even after expiry — it re-enables selling
    const matric = String(matricNumber || "").trim();
    const email = String(schoolEmail || "").trim().toLowerCase();
    if (!matric) return res.status(400).json({ error: "Matric number is required" });
    if (!email || !email.endsWith("@run.edu.ng")) return res.status(400).json({ error: "Valid RUN school email (@run.edu.ng) is required" });
    const existingMatric = await prisma.user.findUnique({ where: { matricNumber: matric } });
    if (existingMatric) return res.status(409).json({ error: "This matric number is already registered" });
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== user.id) return res.status(409).json({ error: "This school email is already registered" });

    // Verify school email via OTP — reuse same OTP flow as upgrade
    // If OTP not provided yet, send OTP to school email
    if (!req.body.otp) {
      const otpCode = generateOTP();
      const otpExpiresAt = getOTPExpiry();
      await prisma.user.update({ where: { id: user.id }, data: { otpCode, otpExpiresAt, pendingSellerEmail: email, pendingSellerMatric: matric } });
      await sendOTPEmail(email, user.fullName, otpCode);
      return res.status(200).json({ message: "OTP sent to your school email", needOtp: true });
    }
    // Verify OTP
    if (!user.otpCode || !user.otpExpiresAt || new Date() > user.otpExpiresAt) return res.status(400).json({ error: "OTP expired, request again" });
    if (req.body.otp !== user.otpCode) return res.status(400).json({ error: "Incorrect OTP" });
    if (user.pendingSellerEmail !== email || user.pendingSellerMatric !== matric) return res.status(400).json({ error: "Email/matric does not match OTP request" });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        matricNumber: matric,
        email, // upgrade to school email
        isFresher: false,
        fresherExpiresAt: null,
        otpCode: null,
        otpExpiresAt: null,
        pendingSellerEmail: null,
        pendingSellerMatric: null,
      },
    });
    return res.status(200).json({ message: "Matric number added — you are now a verified seller", user: sanitizeUser(updated) });
  } catch (err) {
    console.error("[ADD MATRIC NUMBER ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/check-jamb — public, live JAMB matriculation preview
// Body: { jambRegNumber, jambExamYear } -> returns name in green if RUN
// ─────────────────────────────────────────────────────────────
const checkJamb = async (req, res) => {
  try {
    const { jambRegNumber, jambExamYear } = req.body;
    const reg = String(jambRegNumber || "").trim().toUpperCase();
    const year = parseInt(jambExamYear, 10);
    const currentYear = new Date().getFullYear();
    if (!reg || !year) return res.status(400).json({ error: "JAMB number and year are required" });
    if (!/^\d{12}[A-Z]{2}$/.test(reg)) return res.status(400).json({ error: "JAMB number must be 12 digits + 2 letters, e.g. 202441390932IF" });
    if (!year || year < currentYear - 1 || year > currentYear) return res.status(400).json({ error: `JAMB year must be ${currentYear - 1} or ${currentYear}` });
    const result = await verifyJamb({ regNumber: reg, examYear: year });
    return res.status(200).json({
      isRun: result.isRun,
      fullName: result.fullName || "",
      institution: result.institution || "",
      programme: result.programme || "",
      statusText: result.statusText || "",
    });
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: "Can't confirm Jamb Registration now try again later" });
    console.error("[CHECK JAMB ERROR]", err);
    return res.status(500).json({ error: "Could not check JAMB" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/upgrade-to-seller ← PROTECTED (BUYER only)
// Body: { email (RUN email) }
// Sends OTP to the provided RUN email, stores it for verification
// ─────────────────────────────────────────────────────────────
const requestSellerUpgrade = async (req, res) => {
  try {
    const { runEmail, isFresher: rawIsFresher, jambRegNumber, jambExamYear } = req.body;
    const isFresher = rawIsFresher === true || rawIsFresher === "true";

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "SELLER") {
      return res.status(400).json({ error: "Your account is already a seller account" });
    }

    if (isFresher) {
      const reg = String(jambRegNumber || "").trim().toUpperCase();
      const year = parseInt(jambExamYear, 10);
      const currentYear = new Date().getFullYear();
      if (!/^\d{12}[A-Z]{2}$/.test(reg)) return res.status(400).json({ error: "12 digits + 2 letters, e.g. 202441390932IF" });
      if (!year || year < currentYear - 1 || year > currentYear) return res.status(400).json({ error: `Year must be ${currentYear - 1} or ${currentYear}` });
      const existingJamb = await prisma.user.findFirst({ where: { jambRegNumber: reg, jambExamYear: year } });
      if (existingJamb) return res.status(409).json({ error: "Already registered" });
      try {
        const jambRes = await verifyJamb({ regNumber: reg, examYear: year });
        if (!jambRes.isRun) return res.status(400).json({ error: "Not for Redeemer's — check number/year" });
      } catch (jambErr) {
        if (jambErr.status === 503) return res.status(503).json({ error: "Can't confirm Jamb Registration now try again later" });
        if (jambErr.status === 400) return res.status(400).json({ error: jambErr.message });
        return res.status(503).json({ error: "Can't confirm Jamb Registration now try again later" });
      }
      const targetEmail = (runEmail && runEmail.trim()) ? runEmail.trim() : user.email;
      const otpCode = generateOTP();
      const otpExpiresAt = getOTPExpiry();
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt, pendingSellerEmail: targetEmail, pendingSellerIsFresher: true, pendingSellerJambRegNumber: reg, pendingSellerJambExamYear: year, pendingSellerMatric: null },
      });
      await sendOTPEmail(targetEmail, user.fullName, otpCode);
      return res.status(200).json({ message: "A verification code has been sent to your email.", runEmail: targetEmail });
    }

    if (!runEmail || !runEmail.trim()) {
      return res.status(400).json({ error: "RUN school email is required" });
    }
    if (!runEmail.endsWith("@run.edu.ng")) {
      return res.status(400).json({ error: "Must be a valid RUN school email (@run.edu.ng)" });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = getOTPExpiry();
    const pendingMatric = req.body.matricNumber ? req.body.matricNumber.trim() : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt, pendingSellerEmail: runEmail.trim(), pendingSellerMatric: pendingMatric, pendingSellerIsFresher: false, pendingSellerJambRegNumber: null, pendingSellerJambExamYear: null },
    });

    await sendOTPEmail(runEmail, user.fullName, otpCode);

    return res.status(200).json({
      message: "A verification code has been sent to your RUN email.",
      runEmail,
    });
  } catch (err) {
    console.error("[REQUEST SELLER UPGRADE ERROR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/upgrade-to-seller/verify ← PROTECTED (BUYER only)
// Body: { runEmail, otp, matricNumber }
// ─────────────────────────────────────────────────────────────
const verifySellerUpgrade = async (req, res) => {
  try {
    const { runEmail, otp, matricNumber } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "SELLER") {
      return res.status(400).json({ error: "Your account is already a seller account" });
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ error: "No verification code found. Please request a new one." });
    }
    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }
    if (otp !== user.otpCode) {
      return res.status(400).json({ error: "Incorrect verification code" });
    }
    // fresher path — pendingSellerIsFresher flag
    if (user.pendingSellerIsFresher) {
      if (!user.pendingSellerEmail || (runEmail && runEmail.trim() !== user.pendingSellerEmail)) {
        // for fresher, runEmail may be omitted and defaults to current email, so only check if provided
        if (runEmail && runEmail.trim() !== user.pendingSellerEmail) {
          return res.status(400).json({ error: "Email does not match the one that received the code" });
        }
      }
      const reg = user.pendingSellerJambRegNumber;
      const year = user.pendingSellerJambExamYear;
      if (!reg || !year) return res.status(400).json({ error: "JAMB details missing, please request again" });
      const existingJamb = await prisma.user.findFirst({ where: { jambRegNumber: reg, jambExamYear: year } });
      if (existingJamb && existingJamb.id !== user.id) return res.status(409).json({ error: "This JAMB registration number is already registered for that year" });
      const fresherExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "SELLER",
          isFresher: true,
          jambRegNumber: reg,
          jambExamYear: year,
          fresherExpiresAt,
          matricNumber: null,
          otpCode: null,
          otpExpiresAt: null,
          pendingSellerEmail: null,
          pendingSellerMatric: null,
          pendingSellerIsFresher: false,
          pendingSellerJambRegNumber: null,
          pendingSellerJambExamYear: null,
        },
      });
      return res.status(200).json({ message: "Your account has been upgraded to a fresher seller account ✅", user: sanitizeUser(updatedUser) });
    }

    // verify runEmail matches the pending one that OTP was sent to (hijack fix)
    if (!user.pendingSellerEmail || runEmail.trim() !== user.pendingSellerEmail) {
      return res.status(400).json({ error: "RUN email does not match the one that received the code" });
    }
    const finalMatric = matricNumber ? matricNumber.trim() : user.pendingSellerMatric || user.matricNumber;
    if (finalMatric) {
      const existingMatric = await prisma.user.findUnique({ where: { matricNumber: finalMatric } });
      if (existingMatric && existingMatric.id !== user.id) {
        return res.status(409).json({ error: "This matric number is already registered" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "SELLER",
        email: user.pendingSellerEmail,
        matricNumber: finalMatric || user.matricNumber,
        isFresher: false,
        fresherExpiresAt: null,
        otpCode: null,
        otpExpiresAt: null,
        pendingSellerEmail: null,
        pendingSellerMatric: null,
        pendingSellerIsFresher: false,
        pendingSellerJambRegNumber: null,
        pendingSellerJambExamYear: null,
      },
    });

    return res.status(200).json({
      message: "Your account has been upgraded to a seller account ✅",
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error("[VERIFY SELLER UPGRADE ERROR]", err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "This RUN email is already linked to another account" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/unsubscribe/:token ← PUBLIC
// Looks up user by unsubscribeToken, sets marketingOptIn to false,
// returns a simple confirmation HTML page (link is clicked from email)
// ─────────────────────────────────────────────────────────────
const unsubscribe = async (req, res) => {
  const { token } = req.params;

  const htmlPage = (message) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>TrendTribe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">TrendTribe</h2>
        <p style="font-size: 16px;">${message}</p>
      </body>
    </html>
  `;

  try {
    const user = await prisma.user.findUnique({ where: { unsubscribeToken: token } });

    if (!user) {
      return res.status(404).send(htmlPage("This unsubscribe link is invalid or has already been used."));
    }

    if (!user.marketingOptIn) {
      return res.status(200).send(htmlPage("You're already unsubscribed from marketing emails."));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { marketingOptIn: false },
    });

    return res.status(200).send(htmlPage("You've been unsubscribed from marketing emails. You'll still receive important account emails."));
  } catch (err) {
    console.error("[UNSUBSCRIBE ERROR]", err);
    return res.status(500).send(htmlPage("Something went wrong. Please try again later."));
  }
};

const toggleMuteTaskPush = async (req, res) => {
  try {
    const { mute } = req.body;
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { muteTaskPush: !!mute } });
    return res.json({ muteTaskPush: user.muteTaskPush });
  } catch (e) {
    return res.status(500).json({ error: "Could not update preference" });
  }
};

module.exports = {
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
  addMatricNumber,
  checkJamb,
  requestSellerUpgrade,
  verifySellerUpgrade,
  unsubscribe,
  toggleMuteTaskPush,
};
