// src/middleware/verified.middleware.js — Email Verification Guard
// Must run AFTER `protect` — relies on req.user being populated

const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      error: "Please verify your email before creating a listing.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  next();
};

module.exports = { requireVerified };
