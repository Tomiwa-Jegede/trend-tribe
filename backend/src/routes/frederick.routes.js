// src/routes/frederick.routes.js

const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/frederick.controller");
const { optionalAuth } = require("../middleware/optionalAuth.middleware");

router.post("/chat", optionalAuth, chat);

module.exports = router;
