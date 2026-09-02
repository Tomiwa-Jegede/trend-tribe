const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getMyNotifications, getUnreadCount, markRead, markAllRead } = require("../controllers/notification.controller");

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markRead);
router.post("/read-all", markAllRead);

module.exports = router;
