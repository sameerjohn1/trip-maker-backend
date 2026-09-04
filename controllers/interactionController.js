import Favorite from "../models/Favorite.js";
import Inquiry from "../models/Inquiry.js";
import Trip from "../models/Trip.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const listFavorites = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { traveler: req.user._id };
  const [favorites, total] = await Promise.all([
    Favorite.find(filter).populate({
      path: "trip",
      match: { isDeleted: false },
      populate: [
        { path: "destination", select: "name country region imageUrl" },
        { path: "seller", select: "name sellerProfile.agencyName" },
      ],
    }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Favorite.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Favorites fetched successfully", { favorites: favorites.filter((item) => item.trip) }, makePagination(page, limit, total));
});

export const addFavorite = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, ...{ isDeleted: false, status: { $in: ["PUBLISHED", "APPROVED"] } } });
  if (!trip) throw new AppError("Public trip not found", 404);
  const favorite = await Favorite.create({ traveler: req.user._id, trip: trip._id });
  sendSuccess(res, 201, "Trip added to favorites", { favorite });
});

export const removeFavorite = catchAsync(async (req, res) => {
  const deleted = await Favorite.findOneAndDelete({ traveler: req.user._id, trip: req.params.tripId });
  if (!deleted) throw new AppError("Favorite not found", 404);
  sendSuccess(res, 200, "Trip removed from favorites");
});

export const createInquiry = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.tripId, isDeleted: false, status: { $in: ["PUBLISHED", "APPROVED"] } });
  if (!trip) throw new AppError("Public trip not found", 404);
  const { name, email, phone, message } = req.body || {};
  if (!name || !email || !message) throw new AppError("Name, email and message are required", 400);
  const inquiry = await Inquiry.create({
    traveler: req.user._id,
    seller: trip.seller,
    trip: trip._id,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone,
    message: String(message).trim(),
  });
  sendSuccess(res, 201, "Inquiry sent successfully", { inquiry });
});

export const listTravelerInquiries = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { traveler: req.user._id };
  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).populate("trip", "title coverImage city country").populate("seller", "name sellerProfile.agencyName")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Inquiry.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Inquiries fetched successfully", { inquiries }, makePagination(page, limit, total));
});

export const getTravelerInquiry = catchAsync(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, traveler: req.user._id })
    .populate("trip", "title coverImage city country").populate("seller", "name sellerProfile");
  if (!inquiry) throw new AppError("Inquiry not found", 404);
  sendSuccess(res, 200, "Inquiry fetched successfully", { inquiry });
});

export const listSellerInquiries = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { seller: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).populate("trip", "title coverImage city country").populate("traveler", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Inquiry.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Seller inquiries fetched successfully", { inquiries }, makePagination(page, limit, total));
});

export const getSellerInquiry = catchAsync(async (req, res) => {
  const inquiry = await Inquiry.findOne({ _id: req.params.id, seller: req.user._id })
    .populate("trip", "title coverImage").populate("traveler", "name email");
  if (!inquiry) throw new AppError("Inquiry not found", 404);
  sendSuccess(res, 200, "Inquiry fetched successfully", { inquiry });
});

export const updateSellerInquiry = catchAsync(async (req, res) => {
  const { status, response } = req.body || {};
  const allowed = ["NEW", "READ", "RESPONDED", "CLOSED"];
  if (status && !allowed.includes(status)) throw new AppError("Invalid inquiry status", 400);
  if (status === "RESPONDED" && !response) throw new AppError("Response is required when marking an inquiry responded", 400);
  const inquiry = await Inquiry.findOneAndUpdate(
    { _id: req.params.id, seller: req.user._id },
    { $set: { ...(status ? { status } : {}), ...(response ? { response } : {}) } },
    { new: true, runValidators: true },
  );
  if (!inquiry) throw new AppError("Inquiry not found", 404);
  sendSuccess(res, 200, "Inquiry updated successfully", { inquiry });
});