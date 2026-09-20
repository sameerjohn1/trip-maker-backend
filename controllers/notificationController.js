import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const listNotifications = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { recipientId: req.user._id };
  if (req.query.unread === "true") filter.read = false;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).populate("senderId", "_id name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user._id, read: false }),
  ]);
  sendSuccess(res, 200, "Notifications fetched successfully", { notifications, unreadCount }, makePagination(page, limit, total));
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id }, { read: true }, { new: true },
  );
  if (!notification) throw new AppError("Notification not found", 404);
  sendSuccess(res, 200, "Notification marked as read", { notification });
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ recipientId: req.user._id, read: false }, { read: true });
  sendSuccess(res, 200, "Notifications marked as read");
});
