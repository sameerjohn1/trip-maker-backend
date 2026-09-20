import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";
import { getIO } from "../configs/socket.js";

// Helper: compute unread count for a conversation from current user's perspective
const getUnreadCount = async (conversationId, currentUserId) => {
  return Message.countDocuments({
    conversationId,
    sender: { $ne: currentUserId },
    isRead: false,
  });
};

const populateConversation = (query) => query
  .populate("participants", "_id name email role status")
  .populate("trip", "_id title ownerId")
  .populate("lastMessage", "_id content sender isRead createdAt");

const withContext = (chat, userId) => {
  const value = chat.toObject ? chat.toObject() : chat;
  if (value.trip) {
    const ownerId = value.trip.ownerId?._id || value.trip.ownerId;
    value.conversationType = String(ownerId) === String(userId) ? "SELLING" : "BUYING";
  }
  return value;
};

// GET /api/v1/chats - List authenticated user's chats
export const getUserChats = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  // Exclude conversations this user has deleted
  const filter = {
    participants: req.user._id,
    deletedBy: { $ne: req.user._id },
  };

  const [chats, total] = await Promise.all([
    populateConversation(Conversation.find(filter))
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);

  // Attach unread count per conversation
  const chatsWithUnread = await Promise.all(
    chats.map(async (chat) => {
      const unreadCount = await getUnreadCount(chat._id, req.user._id);
      const chatObj = withContext(chat, req.user._id);
      chatObj.unreadCount = unreadCount;
      return chatObj;
    }),
  );

  sendSuccess(res, 200, "Chats fetched successfully", { chats: chatsWithUnread }, makePagination(page, limit, total));
});

// POST /api/v1/chats - Create or retrieve existing chat
export const getOrCreateChat = catchAsync(async (req, res) => {
  if (req.user.role === "ADMIN") throw new AppError("Admins cannot create traveler chats", 403);
  const recipientId = req.body.recipientId || req.body.userId;
  const tripId = req.body.tripId;

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
  let trip = null;
  if (tripId) {
    trip = await Trip.findOne({ _id: tripId, status: "PUBLISHED", isDeleted: false }).select("_id ownerId title");
    if (!trip) throw new AppError("Public trip not found", 404);
    if (String(trip.ownerId) !== String(recipientId)) throw new AppError("recipientId must be the trip owner", 400);
  }

  // Check if recipient has blocked the current user
  if (recipient.blockedUsers?.some((id) => id.toString() === req.user._id.toString())) {
    throw new AppError("You cannot message this user", 403);
  }

  // Find existing conversation (even if deleted — restore it for this user)
  const conversationFilter = {
    participants: { $all: [req.user._id, recipientId] },
    ...(trip ? { trip: trip._id } : { trip: { $exists: false } }),
  };
  let conversation = await populateConversation(Conversation.findOne(conversationFilter));

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
      ...(trip ? { trip: trip._id } : {}),
      lastMessageAt: new Date(),
    });

    conversation = await populateConversation(Conversation.findById(conversation._id));
  } else {
    // If user had previously deleted this conversation, restore it
    if (conversation.deletedBy?.some((id) => id.toString() === req.user._id.toString())) {
      await Conversation.findByIdAndUpdate(conversation._id, {
        $pull: { deletedBy: req.user._id },
      });
    }
  }

  const initialText = req.body.initialMessage || req.body.content;
  if (initialText && typeof initialText === "string" && initialText.trim()) {
    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      content: initialText.trim(),
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newMessage._id,
      lastMessageAt: newMessage.createdAt,
      // Also restore for the other participant if they had deleted it
      $pull: { deletedBy: req.user._id },
    });

    conversation = await populateConversation(Conversation.findById(conversation._id));

    const recipients = conversation.participants.filter((participant) => String(participant._id) !== String(req.user._id));
    await Notification.insertMany(recipients.map((participant) => ({
      recipientId: participant._id || participant,
      senderId: req.user._id,
      type: "MESSAGE",
      chatId: conversation._id,
      message: newMessage.content,
    })));

    const io = getIO();
    if (io) {
      const msgPayload = {
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
      };
      io.to(`chat_${conversation._id}`).emit("message:new", msgPayload);

      // Notify all participants of updated conversation (for unread badges)
      for (const p of conversation.participants) {
        const pid = p._id || p;
        if (pid.toString() !== req.user._id.toString()) {
          const unreadCount = await getUnreadCount(conversation._id, pid);
          io.to(`user_${pid}`).emit("conversation:updated", {
            conversationId: conversation._id,
            lastMessage: msgPayload,
            unreadCount,
          });
        }
      }
    }
  }

  const unreadCount = await getUnreadCount(conversation._id, req.user._id);
  const chatObj = withContext(conversation, req.user._id);
  chatObj.unreadCount = unreadCount;

  sendSuccess(res, 200, "Chat retrieved or created successfully", { chat: chatObj });
});

// GET /api/v1/chats/:chatId/messages - Get messages in a chat
export const getChatMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const conversation = await populateConversation(Conversation.findById(chatId));

  if (!conversation) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === req.user._id.toString(),
  );

  if (!isParticipant && req.user.role !== "ADMIN") {
    throw new AppError("Access denied", 403);
  }

  // Mark messages as read
  await Message.updateMany(
    { conversationId: chatId, sender: { $ne: req.user._id }, isRead: false },
    { $set: { isRead: true } },
  );

  const { page, limit } = paginationOptions(req);
  const [messages, total] = await Promise.all([
    Message.find({ conversationId: chatId })
      .populate("sender", "_id name email role")
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Message.countDocuments({ conversationId: chatId }),
  ]);

  // Notify sender that messages were read
  const io = getIO();
  if (io) {
    io.to(`chat_${chatId}`).emit("messages:read", {
      conversationId: chatId,
      readBy: req.user._id,
    });
  }

  sendSuccess(res, 200, "Messages fetched successfully", { chat: withContext(conversation, req.user._id), messages }, makePagination(page, limit, total));
});

export const markChatRead = catchAsync(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.chatId, participants: req.user._id });
  if (!conversation) throw new AppError("Chat not found", 404);
  const result = await Message.updateMany(
    { conversationId: conversation._id, sender: { $ne: req.user._id }, isRead: false }, { isRead: true },
  );
  await Notification.updateMany({ chatId: conversation._id, recipientId: req.user._id, read: false }, { read: true });
  sendSuccess(res, 200, "Chat marked as read", { modifiedCount: result.modifiedCount });
});

// POST /api/v1/chats/:chatId/messages - Send a message in a chat
export const sendMessage = catchAsync(async (req, res) => {
  if (req.user.role === "ADMIN") throw new AppError("Admins cannot send traveler chat messages", 403);
  const { chatId } = req.params;
  const text = req.body.content || req.body.text;

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new AppError("Message content is required", 400);
  }

  const conversation = await Conversation.findById(chatId).populate(
    "participants",
    "_id name email role blockedUsers",
  );
  if (!conversation) {
    throw new AppError("Chat not found", 404);
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === req.user._id.toString(),
  );

  if (!isParticipant) {
    throw new AppError("Access denied", 403);
  }

  // Check if any other participant has blocked the sender
  for (const participant of conversation.participants) {
    if (participant._id.toString() === req.user._id.toString()) continue;
    // Fetch fresh participant with blockedUsers
    const participantFull = await User.findById(participant._id).select("blockedUsers");
    if (participantFull?.blockedUsers?.some((id) => id.toString() === req.user._id.toString())) {
      throw new AppError("You cannot send messages to this user", 403);
    }
  }

  const message = await Message.create({
    conversationId: chatId,
    sender: req.user._id,
    content: text.trim(),
  });

  // Update conversation: restore for all participants (undelete), update lastMessage + timestamp
  await Conversation.findByIdAndUpdate(chatId, {
    lastMessage: message._id,
    lastMessageAt: message.createdAt,
    $pull: { deletedBy: { $in: conversation.participants.map((p) => p._id) } },
  });

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "_id name email role",
  );

  const recipients = conversation.participants.filter((participant) => String(participant._id) !== String(req.user._id));
  const notifications = await Notification.insertMany(recipients.map((participant) => ({
    recipientId: participant._id,
    senderId: req.user._id,
    type: "MESSAGE",
    chatId: conversation._id,
    message: message.content,
  })));

  const io = getIO();
  if (io) {
    // Broadcast to chat room
    io.to(`chat_${chatId}`).emit("message:new", populatedMessage);

    // Push unread count to all OTHER participants (their personal rooms)
    for (const participant of conversation.participants) {
      const pid = participant._id.toString();
      if (pid !== req.user._id.toString()) {
        const unreadCount = await getUnreadCount(chatId, participant._id);
        io.to(`user_${pid}`).emit("conversation:updated", {
          conversationId: chatId,
          lastMessage: populatedMessage,
          unreadCount,
        });
        const notification = notifications.find((item) => String(item.recipientId) === pid);
        if (notification) io.to(`user_${pid}`).emit("notification:new", notification);
      }
    }
  }

  sendSuccess(res, 201, "Message sent successfully", { message: populatedMessage });
});

// DELETE /api/v1/chats/:chatId - Delete conversation for current user only
export const deleteConversation = catchAsync(async (req, res) => {
  const { chatId } = req.params;
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

  // Soft delete: mark this user as having deleted the conversation
  if (!conversation.deletedBy.some((id) => id.toString() === req.user._id.toString())) {
    conversation.deletedBy.push(req.user._id);
    await conversation.save();
  }

  sendSuccess(res, 200, "Conversation deleted successfully");
});
