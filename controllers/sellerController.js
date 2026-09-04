import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Inquiry from "../models/Inquiry.js";
import Booking from "../models/Booking.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const getSellerProfile = catchAsync(async (req, res) => {
  sendSuccess(res, 200, "Seller profile fetched successfully", {
    profile: req.user.sellerProfile || { verificationStatus: "NOT_SUBMITTED" },
  });
});

export const updateSellerProfile = catchAsync(async (req, res) => {
  const allowed = ["agencyName", "description", "phone", "address"];
  const profile = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: Object.fromEntries(Object.entries(profile).map(([key, value]) => [`sellerProfile.${key}`, value])) },
    { new: true, runValidators: true },
  );
  sendSuccess(res, 200, "Seller profile updated successfully", { profile: user.sellerProfile });
});

export const uploadDocuments = catchAsync(async (req, res) => {
  if (!req.files?.length) throw new AppError("At least one document is required", 400);
  const documents = req.files.map((file) => ({
    url: `/uploads/${file.filename}`,
    originalName: file.originalname,
  }));
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { "sellerProfile.verificationStatus": "PENDING" }, $push: { "sellerProfile.documents": { $each: documents } } },
    { new: true },
  );
  sendSuccess(res, 201, "Seller documents uploaded successfully", { documents, profile: user.sellerProfile });
});

export const dashboard = catchAsync(async (req, res) => {
  const [trips, inquiries, bookings, pendingBookings] = await Promise.all([
    Trip.countDocuments({ seller: req.user._id, isDeleted: false }),
    Inquiry.countDocuments({ seller: req.user._id }),
    Booking.countDocuments({ seller: req.user._id }),
    Booking.countDocuments({ seller: req.user._id, status: "PENDING" }),
  ]);
  sendSuccess(res, 200, "Seller dashboard fetched successfully", {
    seller: publicUser(req.user),
    statistics: { trips, inquiries, bookings, pendingBookings },
  });
});