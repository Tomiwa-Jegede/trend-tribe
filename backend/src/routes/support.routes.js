const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { contact, getThread, listSupport, confirm, adminReply, adminGetThread } = require("../controllers/support.controller");

const userRouter = express.Router();
userRouter.post("/contact", protect, contact);
userRouter.get("/thread", protect, getThread);

const adminRouter = express.Router();
adminRouter.get("/", protect, requireAdmin, listSupport);
adminRouter.get("/:userId/thread", protect, requireAdmin, adminGetThread);
adminRouter.post("/:userId/confirm", protect, requireAdmin, confirm);
adminRouter.post("/:userId/message", protect, requireAdmin, adminReply);

module.exports = { userRouter, adminRouter };
