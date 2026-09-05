// src/routes/push.routes.js
const express = require("express");
const { getVapidPublicKey, subscribe, unsubscribe, testPush } = require("../controllers/push.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Public: VAPID key (needed before permission, no auth yet for anonymous push)
router.get("/vapid-public-key", getVapidPublicKey);

// Subscribe can be with or without auth — try protect optional
router.post("/subscribe", (req, res, next) => {
  // optional auth: attach user if token valid, but don't reject if missing
  const auth = req.headers.authorization;
  if (!auth) return subscribe(req, res);
  // if token present, try protect then subscribe
  return protect(req, res, (err) => {
    if (err) return subscribe(req, res); // ignore auth error, treat as anon
    return subscribe(req, res);
  });
});

router.post("/unsubscribe", unsubscribe);
router.post("/test", protect, testPush);

module.exports = router;
