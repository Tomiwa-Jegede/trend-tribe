// src/middleware/admin.middleware.js — Admin-Only Route Guard
// Must be used AFTER `protect`, since it relies on req.user being set.

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
    });
  }
  next();
};

module.exports = { requireAdmin };
