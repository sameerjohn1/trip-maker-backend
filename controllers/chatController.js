import Chat from "../models/Chat.js";
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
    Chat.find(filter)
      .populate("participants", "_id name email role status sellerProfile")
      .populate("trip", "_id title coverImage city country price")
      .populate("lastMessage", "_id text sender isRead createdAt")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Chat.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Chats fetched successfully", { chats }, makePagination(page, limit, total));
});

// POST /api/v1/chats - Create or retrieve existing chat
export const getOrCreateChat = catchAsync(async (req, res) => {
  const recipientId = req.body.recipientId || req.body.sellerId || req.body.travelerId;
  const tripId = req.body.tripId;

  if (!recipientId) {
    throw new AppError("recipientId (or sellerId / travelerId) is required", 400);
  }

  if (recipientId.toString() === req.user._id.toString()) {
    throw new AppError("Cannot start a chat with yourself", 400);
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new AppError("Recipient user not found", 404);
  }

  // Find existing chat between the two users
  let chat = await Chat.findOne({
    participants: { $all: [req.user._id, recipientId] },
  })
    .populate("participants", "_id name email role status sellerProfile")
    .populate("trip", "_id title coverImage city country price")
    .populate("lastMessage", "_id text sender isRead createdAt");

  if (!chat) {
    chat = await Chat.create({
      participants: [req.user._id, recipientId],
      trip: tripId || null,
      lastMessageAt: new Date(),
    });

    chat = await Chat.findById(chat._id)
      .populate("participants", "_id name email role status sellerProfile")
      .populate("trip", "_id title coverImage city country price")
      .populate("lastMessage", "_id text sender isRead createdAt");
  }

  // If initial message provided, create it
  const initialText = req.body.initialMessage || req.body.text || req.body.content;
  if (initialText && typeof initialText === "string" && initialText.trim()) {
    const newMessage = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      text: initialText.trim(),
    });

    chat.lastMessage = newMessage._id;
    chat.lastMessageText = newMessage.text;
    chat.lastMessageAt = newMessage.createdAt;
    await chat.save();

    chat = await Chat.findById(chat._id)
      .populate("participants", "_id name email role status sellerProfile")
      .populate("trip", "_id title coverImage city country price")
      .populate("lastMessage", "_id text sender isRead createdAt");

    const io = getIO();
    if (io) {
      io.to(`chat_${chat._id}`).emit("new_message", {
        _id: newMessage._id,
        chat: chat._id,
        sender: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        text: newMessage.text,
        isRead: newMessage.isRead,
        createdAt: newMessage.createdAt,
      });
    }
  }

  sendSuccess(res, 200, "Chat retrieved or created successfully", { chat });
});

// GET /api/v1/chats/:chatId/messages - Get messages in a chat
export const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findById(chatId).populate(
    "participants",
    "_id name email role status sellerProfile",
  );

  if (!chat) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = chat.participants.some(
    (p) => p._id.toString() === req.user._id.toString(),
  );
  const isAdmin = req.user.role === "ADMIN";

  if (!isParticipant && !isAdmin) {
    throw new AppError("Access denied: You are not a participant of this chat", 403);
  }

  // Mark unread messages sent by opponent as read
  await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user._id }, isRead: false },
    { $set: { isRead: true } },
  );

  const messages = await Message.find({ chat: chatId })
    .populate("sender", "_id name email role")
    .sort({ createdAt: 1 });

  sendSuccess(res, 200, "Messages fetched successfully", { chat, messages });
});

// POST /api/v1/chats/:chatId/messages - Send a message in a chat
export const sendMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const text = req.body.text || req.body.content;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new AppError("Message text is required", 400);
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = chat.participants.some(
    (p) => p.toString() === req.user._id.toString(),
  );
  const isAdmin = req.user.role === "ADMIN";

  if (!isParticipant && !isAdmin) {
    throw new AppError("Access denied: You are not a participant of this chat", 403);
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    text: text.trim(),
  });

  chat.lastMessage = message._id;
  chat.lastMessageText = message.text;
  chat.lastMessageAt = message.createdAt;
  await chat.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "_id name email role",
  );

  // Real-time socket broadcast
  const io = getIO();
  if (io) {
    io.to(`chat_${chatId}`).emit("new_message", populatedMessage);
  }

  sendSuccess(res, 201, "Message sent successfully", { message: populatedMessage });
});

// GET /api/v1/admin/chats - Admin: List all chats across system
export const getAdminChats = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);

  const [chats, total] = await Promise.all([
    Chat.find({})
      .populate("participants", "_id name email role status sellerProfile")
      .populate("trip", "_id title coverImage city country price")
      .populate("lastMessage", "_id text sender isRead createdAt")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Chat.countDocuments({}),
  ]);

  sendSuccess(res, 200, "Admin chats fetched successfully", { chats }, makePagination(page, limit, total));
});

// GET /api/v1/admin/chats/:chatId/messages - Admin: Get all messages for any chat
export const getAdminChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findById(chatId)
    .populate("participants", "_id name email role status sellerProfile")
    .populate("trip", "_id title coverImage city country price");

  if (!chat) {
    throw new AppError("Chat not found", 404);
  }

  const messages = await Message.find({ chat: chatId })
    .populate("sender", "_id name email role")
    .sort({ createdAt: 1 });

  sendSuccess(res, 200, "Admin chat messages fetched successfully", { chat, messages });
});
