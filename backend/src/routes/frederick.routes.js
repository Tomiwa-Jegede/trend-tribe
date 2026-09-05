// src/routes/frederick.routes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/frederick.controller");
const { optionalAuth } = require("../middleware/optionalAuth.middleware");
const { uploadMemory } = require("../middleware/upload.middleware");
const { frederickLimiter } = require("../middleware/rateLimit");
router.post("/chat", frederickLimiter, optionalAuth, uploadMemory.single("image"), chat);
module.exports = router;