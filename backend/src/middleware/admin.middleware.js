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

const TOP_ADMIN_USERNAME = "Jegede01";
const isTopAdmin = (user) => user && user.username === TOP_ADMIN_USERNAME;
const requireTopAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
  if (!isTopAdmin(req.user)) {
    return res.status(403).json({ error: "Treasury access denied — Top Admin only." });
  }
  next();
};

module.exports = { requireAdmin, requireTopAdmin, isTopAdmin, TOP_ADMIN_USERNAME };
