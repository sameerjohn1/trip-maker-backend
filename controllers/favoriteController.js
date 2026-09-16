import Favorite from "../models/Favorite.js";
import Trip from "../models/Trip.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

// Resolve postId from either :postId or :id route param
const resolvePostId = (req) => req.params.postId || req.params.id;

export const listFavorites = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { userId: req.user._id };
  const [favorites, total] = await Promise.all([
    Favorite.find(filter).populate({
      path: "postId",
      match: { isDeleted: false },
      populate: [
        { path: "destination", select: "name country region imageUrl" },
        { path: "ownerId", select: "name" },
      ],
    }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Favorite.countDocuments(filter),
  ]);
  const validFavorites = favorites.filter((item) => item.postId);
  sendSuccess(res, 200, "Favorites fetched successfully", { favorites: validFavorites }, makePagination(page, limit, total));
});

export const addFavorite = catchAsync(async (req, res) => {
  const postId = resolvePostId(req);
  const trip = await Trip.findOne({ _id: postId, isDeleted: false, status: "PUBLISHED" });
  if (!trip) throw new AppError("Public post not found", 404);

  const existing = await Favorite.findOne({ userId: req.user._id, postId: trip._id });
  if (existing) throw new AppError("Post is already in favorites", 409);

  const favorite = await Favorite.create({ userId: req.user._id, postId: trip._id });
  trip.favoriteCount += 1;
  await trip.save();

  sendSuccess(res, 201, "Post added to favorites", { favorite, favoriteCount: trip.favoriteCount });
});

export const removeFavorite = catchAsync(async (req, res) => {
  const postId = resolvePostId(req);
  const deleted = await Favorite.findOneAndDelete({ userId: req.user._id, postId });
  if (!deleted) throw new AppError("Favorite not found", 404);

  const trip = await Trip.findById(postId);
  if (trip) {
    trip.favoriteCount = Math.max(0, trip.favoriteCount - 1);
    await trip.save();
  }

  sendSuccess(res, 200, "Post removed from favorites", { favoriteCount: trip?.favoriteCount || 0 });
});

export const checkFavorite = catchAsync(async (req, res) => {
  const postId = resolvePostId(req);
  const favorite = await Favorite.findOne({ userId: req.user._id, postId });
  sendSuccess(res, 200, "Checked favorite", { favorited: !!favorite });
});
