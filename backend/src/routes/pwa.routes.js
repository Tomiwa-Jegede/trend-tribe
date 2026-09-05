// src/routes/pwa.routes.js
const express = require("express");
const { logInstall, getStats } = require("../controllers/pwa.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();

// Public log — optional auth (attach user if token present, don't require)
router.post("/installed", (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return logInstall(req, res);
  return protect(req, res, (err) => {
    if (err) return logInstall(req, res);
    return logInstall(req, res);
  });
});
router.post("/launch", (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return logInstall(req, res);
  return protect(req, res, (err) => {
    if (err) return logInstall(req, res);
    return logInstall(req, res);
  });
});

router.get("/stats", protect, requireAdmin, getStats);

module.exports = router;
