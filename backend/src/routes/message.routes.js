const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getMyMessages, getMessageById, markRead, markAllRead, getUnreadCount, deleteOne, deleteMany, deleteAll, createMessage, getThread, markDelivered, getPresence, getConversations } = require("../controllers/message.controller");

const router = express.Router();
router.use(protect);
router.post("/", createMessage);
router.get("/conversations", getConversations);
router.get("/", getMyMessages);
router.get("/thread", getThread);
router.get("/presence", getPresence);
router.post("/:id/delivered", markDelivered);
router.get("/unread-count", getUnreadCount);
router.get("/:id", getMessageById);
router.patch("/:id/read", markRead);
router.post("/read-all", markAllRead);
router.delete("/", deleteAll);
router.post("/bulk-delete", deleteMany);
router.delete("/:id", deleteOne);

module.exports = router;
