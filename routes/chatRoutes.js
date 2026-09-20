import express from "express";
import {
  getChatMessages,
  getOrCreateChat,
  getUserChats,
  sendMessage,
  deleteConversation,
  markChatRead,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getUserChats).post(getOrCreateChat);
router.route("/:chatId/messages").get(getChatMessages).post(sendMessage);
router.patch("/:chatId/read", markChatRead);
router.route("/:chatId").delete(deleteConversation);

export default router;
