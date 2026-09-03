const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getMyMessages, getMessageById, markRead, markAllRead, getUnreadCount, deleteOne, deleteMany, deleteAll } = require("../controllers/message.controller");

const router = express.Router();
router.use(protect);
router.get("/", getMyMessages);
router.get("/unread-count", getUnreadCount);
router.get("/:id", getMessageById);
router.patch("/:id/read", markRead);
router.post("/read-all", markAllRead);
router.delete("/", deleteAll);
router.post("/bulk-delete", deleteMany);
router.delete("/:id", deleteOne);

module.exports = router;
