import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Booking from "../models/Booking.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions, publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const dashboard = catchAsync(async (req, res) => {
  const [
    totalUsers, 
    totalPosts, 
    pendingPosts, 
    publishedPosts, 
    rejectedPosts, 
    expiredPosts,
    totalBookings,
    aggregations
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: "BANNED" } }),
    Trip.countDocuments({ isDeleted: false }),
    Trip.countDocuments({ status: "PENDING_APPROVAL", isDeleted: false }),
    Trip.countDocuments({ status: "PUBLISHED", isDeleted: false }),
    Trip.countDocuments({ status: "REJECTED", isDeleted: false }),
    Trip.countDocuments({ status: "EXPIRED", isDeleted: false }),
    Booking.countDocuments(),
    Trip.aggregate([
      { $match: { isDeleted: false } },
      { $group: {
        _id: null,
        totalViews: { $sum: "$viewCount" },
        totalFavorites: { $sum: "$favoriteCount" },
        totalSales: { $sum: "$sales" },
        totalRevenue: { $sum: "$revenue" }
      }}
    ])
  ]);

  const stats = aggregations[0] || { totalViews: 0, totalFavorites: 0, totalSales: 0, totalRevenue: 0 };

  sendSuccess(res, 200, "Admin dashboard fetched successfully", {
    statistics: {
      totalUsers,
      totalPosts,
      pendingPosts,
      publishedPosts,
      rejectedPosts,
      expiredPosts,
      totalViews: stats.totalViews,
      totalFavorites: stats.totalFavorites,
      totalBookings,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
    },
  });
});

export const listUsers = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$or = [
    { name: new RegExp(req.query.search, "i") },
    { email: new RegExp(req.query.search, "i") },
  ];
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Users fetched successfully", { users: users.map(publicUser) }, makePagination(page, limit, total));
});

export const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  sendSuccess(res, 200, "User fetched successfully", { user: publicUser(user) });
});

export const updateUserStatus = catchAsync(async (req, res) => {
  const allowed = ["ACTIVE", "SUSPENDED", "BANNED"];
  if (!allowed.includes(req.body?.status)) throw new AppError("Invalid user status", 400);
  if (String(req.params.id) === String(req.user._id)) throw new AppError("Admin cannot change their own account status", 400);
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status, $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) throw new AppError("User not found", 404);
  sendSuccess(res, 200, "User status updated successfully", { user: publicUser(user) });
});

export const deleteUser = catchAsync(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new AppError("Admin cannot delete their own account", 400);
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "BANNED", $inc: { tokenVersion: 1 } },
    { new: true },
  );
  if (!user) throw new AppError("User not found", 404);
  sendSuccess(res, 200, "User banned successfully", { user: publicUser(user) });
});

export const listAdminTrips = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { isDeleted: false };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.ownerId) filter.ownerId = req.query.ownerId;
  if (req.query.search) filter.title = new RegExp(req.query.search, "i");
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("ownerId", "name email").populate("destination", "name country")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Admin posts fetched successfully", { trips }, makePagination(page, limit, total));
});

export const getAdminTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, isDeleted: false }).populate("ownerId").populate("destination");
  if (!trip) throw new AppError("Post not found", 404);
  sendSuccess(res, 200, "Post fetched successfully", { trip });
});

export const approveTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PENDING_APPROVAL", isDeleted: false },
    { status: "PUBLISHED", rejectionReason: undefined },
    { new: true },
  );
  if (!trip) throw new AppError("Only pending posts can be approved", 400);
  sendSuccess(res, 200, "Post approved and published successfully", { trip });
});

export const rejectTrip = catchAsync(async (req, res) => {
  if (!req.body?.reason) throw new AppError("Rejection reason is required", 400);
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PENDING_APPROVAL", isDeleted: false },
    { status: "REJECTED", rejectionReason: req.body.reason },
    { new: true },
  );
  if (!trip) throw new AppError("Only pending posts can be rejected", 400);
  sendSuccess(res, 200, "Post rejected successfully", { trip });
});

export const suspendTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PUBLISHED", isDeleted: false },
    { status: "SUSPENDED" }, { new: true },
  );
  if (!trip) throw new AppError("Only published posts can be suspended", 400);
  sendSuccess(res, 200, "Post suspended successfully", { trip });
});

export const reactivateTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "SUSPENDED", isDeleted: false },
    { status: "PUBLISHED" }, { new: true },
  );
  if (!trip) throw new AppError("Only suspended posts can be reactivated", 400);
  sendSuccess(res, 200, "Post reactivated successfully", { trip });
});

export const deleteAdminTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );
  if (!trip) throw new AppError("Post not found", 404);
  sendSuccess(res, 200, "Post archived successfully", { trip });
});

export const listAdminBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = req.query.status ? { status: req.query.status } : {};
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate("postId", "title").populate("userId", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Admin bookings fetched successfully", { bookings }, makePagination(page, limit, total));
});
