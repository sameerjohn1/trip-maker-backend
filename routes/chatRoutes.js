import express from "express";
import {
  getChatMessages,
  getOrCreateChat,
  getUserChats,
  sendMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getUserChats).post(getOrCreateChat);
router.route("/:chatId/messages").get(getChatMessages).post(sendMessage);

export default router;
