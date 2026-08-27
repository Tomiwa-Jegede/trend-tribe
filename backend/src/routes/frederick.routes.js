// src/routes/frederick.routes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/frederick.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadMemory } = require("../middleware/upload.middleware");
router.post("/chat", protect, uploadMemory.single("image"), chat);
module.exports = router;