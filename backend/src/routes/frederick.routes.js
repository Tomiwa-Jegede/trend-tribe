// src/routes/frederick.routes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/frederick.controller");
const { protect } = require("../middleware/auth.middleware");
router.post("/chat", protect, chat);
module.exports = router;