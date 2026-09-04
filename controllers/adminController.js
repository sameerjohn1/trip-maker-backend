import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Booking from "../models/Booking.js";
import Inquiry from "../models/Inquiry.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions, publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const dashboard = catchAsync(async (req, res) => {
  const [
    totalUsers, totalTravelers, totalSellers, totalTrips, pendingTrips, activeTrips,
    totalBookings, pendingBookings, cancelledBookings, recentActivity,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: "DEACTIVATED" } }),
    User.countDocuments({ role: "TRAVELER", status: { $ne: "DEACTIVATED" } }),
    User.countDocuments({ role: "SELLER", status: { $ne: "DEACTIVATED" } }),
    Trip.countDocuments({ isDeleted: false }),
    Trip.countDocuments({ status: "PENDING_APPROVAL", isDeleted: false }),
    Trip.countDocuments({ status: "PUBLISHED", isDeleted: false }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "PENDING" }),
    Booking.countDocuments({ status: "CANCELLED" }),
    Promise.all([
      User.find().select("name role createdAt").sort({ createdAt: -1 }).limit(5).lean(),
      Trip.find().select("title status createdAt").sort({ createdAt: -1 }).limit(5).lean(),
      Booking.find().select("status totalPrice createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    ]),
  ]);
  sendSuccess(res, 200, "Admin dashboard fetched successfully", {
    statistics: { totalUsers, totalTravelers, totalSellers, totalTrips, pendingTrips, activeTrips, totalBookings, pendingBookings, cancelledBookings },
    recentActivity,
  });
});

const userFilter = (req) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$or = [
    { name: new RegExp(req.query.search, "i") },
    { email: new RegExp(req.query.search, "i") },
  ];
  return filter;
};

export const listUsers = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = userFilter(req);
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
  const allowed = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "DEACTIVATED"];
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
    { status: "DEACTIVATED", $inc: { tokenVersion: 1 } },
    { new: true },
  );
  if (!user) throw new AppError("User not found", 404);
  sendSuccess(res, 200, "User deactivated successfully", { user: publicUser(user) });
});

export const listSellers = catchAsync(async (req, res) => {
  req.query.role = "SELLER";
  return listUsers(req, res);
});

export const approveSeller = catchAsync(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "SELLER" },
    { status: "ACTIVE", "sellerProfile.verificationStatus": "APPROVED", "sellerProfile.rejectionReason": undefined },
    { new: true },
  );
  if (!user) throw new AppError("Seller not found", 404);
  sendSuccess(res, 200, "Seller approved successfully", { user: publicUser(user) });
});

export const rejectSeller = catchAsync(async (req, res) => {
  if (!req.body?.reason) throw new AppError("Rejection reason is required", 400);
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "SELLER" },
    { status: "REJECTED", "sellerProfile.verificationStatus": "REJECTED", "sellerProfile.rejectionReason": req.body.reason, $inc: { tokenVersion: 1 } },
    { new: true },
  );
  if (!user) throw new AppError("Seller not found", 404);
  sendSuccess(res, 200, "Seller rejected successfully", { user: publicUser(user) });
});

const adminTripFilter = (req) => {
  const filter = { isDeleted: false };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.seller) filter.seller = req.query.seller;
  if (req.query.search) filter.title = new RegExp(req.query.search, "i");
  return filter;
};

export const listAdminTrips = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = adminTripFilter(req);
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("seller", "name email sellerProfile").populate("destination", "name country")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Admin trips fetched successfully", { trips }, makePagination(page, limit, total));
});

export const getAdminTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, isDeleted: false }).populate("seller").populate("destination");
  if (!trip) throw new AppError("Trip not found", 404);
  sendSuccess(res, 200, "Trip fetched successfully", { trip });
});

export const approveTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PENDING_APPROVAL", isDeleted: false },
    { status: "PUBLISHED", rejectionReason: undefined, requiredChanges: undefined },
    { new: true },
  );
  if (!trip) throw new AppError("Only pending trips can be approved", 400);
  sendSuccess(res, 200, "Trip approved and published successfully", { trip });
});

export const rejectTrip = catchAsync(async (req, res) => {
  if (!req.body?.reason) throw new AppError("Rejection reason is required", 400);
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PENDING_APPROVAL", isDeleted: false },
    { status: "REJECTED", rejectionReason: req.body.reason, requiredChanges: req.body.requiredChanges || req.body.reason },
    { new: true },
  );
  if (!trip) throw new AppError("Only pending trips can be rejected", 400);
  sendSuccess(res, 200, "Trip rejected successfully", { trip });
});

export const unpublishTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, status: { $in: ["PUBLISHED", "APPROVED"] } },
    { status: "UNPUBLISHED" },
    { new: true },
  );
  if (!trip) throw new AppError("Published trip not found", 404);
  sendSuccess(res, 200, "Trip unpublished successfully", { trip });
});

export const deleteAdminTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, status: "ARCHIVED" },
    { new: true },
  );
  if (!trip) throw new AppError("Trip not found", 404);
  sendSuccess(res, 200, "Trip archived successfully", { trip });
});

export const listAdminBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = req.query.status ? { status: req.query.status } : {};
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate("trip", "title").populate("traveler", "name email").populate("seller", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Admin bookings fetched successfully", { bookings }, makePagination(page, limit, total));
});

export const getAdminBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("trip").populate("traveler", "name email").populate("seller", "name email");
  if (!booking) throw new AppError("Booking not found", 404);
  sendSuccess(res, 200, "Booking fetched successfully", { booking });
});