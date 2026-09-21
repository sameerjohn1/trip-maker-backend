import User from "../models/User.js";
import Trip from "../models/Trip.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  sendSuccess(res, 200, "Profile fetched successfully", { user: publicUser(user) });
});

export const updateProfile = catchAsync(async (req, res) => {
  const body = req.body || {};
  const updates = {};

  if (body.name !== undefined) updates.name = body.name;
  // `phone` is canonical. Accept the legacy/frontend alias when `phone` is absent.
  if (body.phone !== undefined || body.phoneNumber !== undefined) {
    updates.phone = body.phone ?? body.phoneNumber;
  }
  if (body.profilePhoto !== undefined) updates.profilePhoto = body.profilePhoto;
  if (body.showPhoneInPost !== undefined) updates.showPhoneInPost = body.showPhoneInPost;

  if (updates.name !== undefined && (typeof updates.name !== "string" || updates.name.trim().length < 2)) {
    throw new AppError("Name must be at least 2 characters long", 400);
  }
  if (updates.phone !== undefined && (typeof updates.phone !== "string" || updates.phone.trim().length > 50)) {
    throw new AppError("Phone must be a string of at most 50 characters", 400);
  }
  if (updates.profilePhoto !== undefined && (typeof updates.profilePhoto !== "string" || updates.profilePhoto.trim().length > 2000)) {
    throw new AppError("Profile photo must be a valid URL string", 400);
  }
  if (updates.showPhoneInPost !== undefined && typeof updates.showPhoneInPost !== "boolean") {
    throw new AppError("showPhoneInPost must be a boolean", 400);
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  sendSuccess(res, 200, "Profile updated successfully", { user: publicUser(user) });
});

export const deactivateAccount = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { status: "SUSPENDED", $inc: { tokenVersion: 1 } });
  sendSuccess(res, 200, "Account deactivated successfully");
});

export const getUserAnalytics = catchAsync(async (req, res) => {
  const posts = await Trip.find({ ownerId: req.user._id, isDeleted: false });
  
  const analytics = {
    totalPosts: posts.length,
    publishedPosts: posts.filter(p => p.status === "PUBLISHED").length,
    pendingPosts: posts.filter(p => p.status === "PENDING_APPROVAL").length,
    rejectedPosts: posts.filter(p => p.status === "REJECTED").length,
    expiredPosts: posts.filter(p => p.status === "EXPIRED").length,
    totalViews: posts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
    totalFavorites: posts.reduce((sum, p) => sum + (p.favoriteCount || 0), 0),
    totalBookings: posts.reduce((sum, p) => sum + (p.bookingCount || 0), 0),
    totalSales: posts.reduce((sum, p) => sum + (p.sales || 0), 0),
    totalRevenue: posts.reduce((sum, p) => sum + (p.revenue || 0), 0),
  };

  sendSuccess(res, 200, "User analytics fetched successfully", analytics);
});
