import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";
import { getIO } from "../configs/socket.js";

// GET /api/v1/chats - List authenticated user's chats
export const getUserChats = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { participants: req.user._id };

  const [chats, total] = await Promise.all([
    Conversation.find(filter)
      .populate("participants", "_id name email role status")
      .populate("lastMessage", "_id content sender isRead createdAt")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Chats fetched successfully", { chats }, makePagination(page, limit, total));
});

// POST /api/v1/chats - Create or retrieve existing chat
export const getOrCreateChat = catchAsync(async (req, res) => {
  const recipientId = req.body.recipientId || req.body.userId;

  if (!recipientId) {
    throw new AppError("recipientId is required", 400);
  }

  if (recipientId.toString() === req.user._id.toString()) {
    throw new AppError("Cannot start a chat with yourself", 400);
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new AppError("Recipient user not found", 404);
  }

  // Find existing conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipientId] },
  })
    .populate("participants", "_id name email role status")
    .populate("lastMessage", "_id content sender isRead createdAt");

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "_id name email role status");
  }

  const initialText = req.body.initialMessage || req.body.content;
  if (initialText && typeof initialText === "string" && initialText.trim()) {
    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      content: initialText.trim(),
    });

    conversation.lastMessage = newMessage._id;
    await conversation.save();

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "_id name email role status")
      .populate("lastMessage", "_id content sender isRead createdAt");

    const io = getIO();
    if (io) {
      io.to(`chat_${conversation._id}`).emit("message:new", {
        _id: newMessage._id,
        conversationId: conversation._id,
        sender: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        },
        content: newMessage.content,
        isRead: newMessage.isRead,
        createdAt: newMessage.createdAt,
      });
    }
  }

  sendSuccess(res, 200, "Chat retrieved or created successfully", { chat: conversation });
});

// GET /api/v1/chats/:chatId/messages - Get messages in a chat
export const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const conversation = await Conversation.findById(chatId).populate(
    "participants",
    "_id name email role status",
  );

  if (!conversation) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === req.user._id.toString(),
  );

  if (!isParticipant && req.user.role !== "ADMIN") {
    throw new AppError("Access denied", 403);
  }

  await Message.updateMany(
    { conversationId: chatId, sender: { $ne: req.user._id }, isRead: false },
    { $set: { isRead: true } },
  );

  const messages = await Message.find({ conversationId: chatId })
    .populate("sender", "_id name email role")
    .sort({ createdAt: 1 });

  sendSuccess(res, 200, "Messages fetched successfully", { chat: conversation, messages });
});

// POST /api/v1/chats/:chatId/messages - Send a message in a chat
export const sendMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const text = req.body.content || req.body.text;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new AppError("Message content is required", 400);
  }

  const conversation = await Conversation.findById(chatId);
  if (!conversation) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === req.user._id.toString(),
  );

  if (!isParticipant && req.user.role !== "ADMIN") {
    throw new AppError("Access denied", 403);
  }

  const message = await Message.create({
    conversationId: chatId,
    sender: req.user._id,
    content: text.trim(),
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "_id name email role",
  );

  const io = getIO();
  if (io) {
    io.to(`chat_${chatId}`).emit("message:new", populatedMessage);
  }

  sendSuccess(res, 201, "Message sent successfully", { message: populatedMessage });
});
