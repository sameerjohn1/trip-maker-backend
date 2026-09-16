import Trip from "../models/Trip.js";
import Destination from "../models/Destination.js";
import Favorite from "../models/Favorite.js";
import Booking from "../models/Booking.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions, parseJsonField, removeFile } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";
import { runAutomatedModeration } from "../services/moderationService.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const arrayFields = ["availability", "highlights", "includedServices", "excludedServices", "itinerary"];

// Upload a single file buffer to Cloudinary and return secure URL
const uploadImageToCloudinary = async (buffer, filename) => {
  const result = await uploadToCloudinary(buffer, "trip-marketplace/trips", filename);
  return result.secure_url;
};

const payloadFromRequest = async (req) => {
  const body = { ...(req.body || {}) };
  for (const field of arrayFields) if (body[field] !== undefined) body[field] = parseJsonField(body[field], []);
  for (const field of ["duration", "numberOfNights", "price", "discountPrice", "depositAmount", "minimumGroupSize"]) {
    if (body[field] !== undefined && body[field] !== "") body[field] = Number(body[field]);
  }
  const files = req.files || {};

  // Upload to Cloudinary if configured, otherwise skip (no local fallback for production)
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

  if (files.coverImage?.[0]) {
    const filename = `cover_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    if (hasCloudinary) {
      body.coverImage = await uploadImageToCloudinary(files.coverImage[0].buffer, filename);
    } else {
      body.coverImage = `/uploads/${files.coverImage[0].filename}`;
    }
  }

  if (files.galleryImages?.length) {
    const uploadedGallery = await Promise.all(
      files.galleryImages.map(async (file, i) => {
        const filename = `gallery_${Date.now()}_${i}_${Math.round(Math.random() * 1e9)}`;
        if (hasCloudinary) {
          return uploadImageToCloudinary(file.buffer, filename);
        }
        return `/uploads/${file.filename}`;
      })
    );
    body.galleryImages = uploadedGallery;
  }

  return body;
};


const validatePrice = (body) => {
  if (body.discountPrice !== undefined && body.discountPrice > body.price) {
    throw new AppError('Discount price cannot be greater than the original price', 400);
  }
};

const validateTripPayload = (body) => {
  if (body.availability !== undefined) {
    if (!Array.isArray(body.availability)) throw new AppError('availability must be an array', 400);
    body.availability = body.availability.map((date) => ({
      ...date,
      departureDate: new Date(date.departureDate),
      returnDate: new Date(date.returnDate),
      totalSeats: Number(date.totalSeats),
      availableSeats: date.availableSeats === undefined ? Number(date.totalSeats) : Number(date.availableSeats),
      minimumGroupSize: Number(date.minimumGroupSize || 1),
    }));
    body.availability.forEach((date) => {
      const now = new Date();
      if (Number.isNaN(date.departureDate.getTime()) || Number.isNaN(date.returnDate.getTime())) {
        throw new AppError('Invalid departure or return date', 400);
      }
      if (date.returnDate <= date.departureDate) {
        throw new AppError('returnDate must be later than departureDate', 400);
      }
      if (!Number.isInteger(date.totalSeats) || date.totalSeats < 1) {
        throw new AppError('totalSeats must be an integer >= 1', 400);
      }
    });
  }
};

const calculateExpiresAt = (availability) => {
  if (!availability || !availability.length) return null;
  const endDates = availability.map(a => new Date(a.returnDate).getTime());
  const maxDate = new Date(Math.max(...endDates));
  // Add 1 day
  maxDate.setDate(maxDate.getDate() + 1);
  return maxDate;
};

const publicFilter = (req) => {
  const filter = { isDeleted: false, status: "PUBLISHED", expiresAt: { $gt: new Date() } };
  const q = req.query;
  if (q.search) {
    const regex = new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: regex }, { country: regex }, { city: regex }, { category: regex }, { tripType: regex }];
  }
  for (const key of ["country", "city", "category", "tripType"]) if (q[key]) filter[key] = q[key];
  if (q.destination) filter.destination = q.destination;
  if (q.ownerId) filter.ownerId = q.ownerId;
  if (q.minPrice || q.maxPrice) filter.price = {};
  if (q.minPrice) filter.price.$gte = Number(q.minPrice);
  if (q.maxPrice) filter.price.$lte = Number(q.maxPrice);
  if (q.duration) filter.duration = Number(q.duration);
  return filter;
};

const tripSort = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  most_famous: { favoriteCount: -1, createdAt: -1, _id: -1 },
  most_favorites: { favoriteCount: -1, createdAt: -1, _id: -1 },
  most_viewed: { viewCount: -1, createdAt: -1, _id: -1 },
};

export const listPublicTrips = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = publicFilter(req);
  const sort = tripSort[req.query.sort] || tripSort.most_famous;
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("destination", "name country region imageUrl").populate("ownerId", "name")
      .sort(sort).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Trips fetched successfully", { items: trips }, makePagination(page, limit, total));
});

export const getPublicTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ...publicFilter(req) })
    .populate("destination").populate("ownerId", "name email");
  if (!trip) throw new AppError("Trip not found", 404);
  sendSuccess(res, 200, "Trip fetched successfully", { trip });
});

export const listUserPosts = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { ownerId: req.user._id, isDeleted: false };
  if (req.query.status) filter.status = req.query.status;
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("destination", "name country").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "User posts fetched successfully", { items: trips }, makePagination(page, limit, total));
});

export const getUserPost = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id, isDeleted: false }).populate("destination");
  if (!trip) throw new AppError("Post not found", 404);
  sendSuccess(res, 200, "Post fetched successfully", { trip });
});

export const createTrip = catchAsync(async (req, res) => {
  const body = payloadFromRequest(req);
  validatePrice(body);
  validateTripPayload(body);

  if (body.destination && (!body.country || !body.city)) {
    const destDoc = await Destination.findById(body.destination);
    if (destDoc) {
      if (!body.country) body.country = destDoc.country;
      if (!body.city) body.city = destDoc.city || destDoc.name;
    }
  }

  if (body.numberOfNights === undefined && body.duration !== undefined) {
    body.numberOfNights = Math.max(0, Number(body.duration) - 1);
  }
  
  if (body.availability) {
    body.expiresAt = calculateExpiresAt(body.availability);
  }

  const trip = await Trip.create({ ...body, ownerId: req.user._id, status: "DRAFT" });
  sendSuccess(res, 201, "Post draft created successfully", { trip });
});

export const updateTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Post not found", 404);
  const body = payloadFromRequest(req);
  validatePrice(body);
  validateTripPayload(body);

  if (body.destination && (!body.country || !body.city)) {
    const destDoc = await Destination.findById(body.destination);
    if (destDoc) {
      if (!body.country && !trip.country) body.country = destDoc.country;
      if (!body.city && !trip.city) body.city = destDoc.city || destDoc.name;
    }
  }
  
  if (body.availability) {
    body.expiresAt = calculateExpiresAt(body.availability);
  }

  delete body.status;
  delete body.ownerId;
  const importantFields = ["price", "discountPrice", "destination", "availability", "itinerary", "country", "city", "title", "shortDescription", "fullDescription"];
  const needsApproval = ["PUBLISHED"].includes(trip.status) &&
    importantFields.some((field) => body[field] !== undefined);
  if (needsApproval) {
    body.status = "PENDING_APPROVAL";
    body.rejectionReason = undefined;
  }
  Object.assign(trip, body);
  await trip.save();
  sendSuccess(res, 200, needsApproval ? "Post updated and sent for re-approval" : "Post updated successfully", { trip });
});

export const deleteTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Post not found", 404);
  const confirmed = await Booking.exists({ postId: trip._id, status: { $in: ["CONFIRMED", "COMPLETED"] } });
  if (confirmed) {
    trip.isDeleted = true;
    await trip.save();
    return sendSuccess(res, 200, "Post archived because it has confirmed bookings");
  }
  trip.isDeleted = true;
  await trip.save();
  [...(trip.galleryImages || []), trip.coverImage].forEach(removeFile);
  await Favorite.deleteMany({ postId: trip._id });
  sendSuccess(res, 200, "Post deleted successfully");
});

export const submitTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Post not found", 404);
  if (!["DRAFT", "REJECTED", "EXPIRED"].includes(trip.status)) throw new AppError("Only draft, rejected, or expired posts can be submitted", 400);
  const required = ["title", "shortDescription", "fullDescription", "country", "city", "category", "tripType", "price"];
  const missing = required.filter((field) => !trip[field] && trip[field] !== 0);
  if (missing.length || !trip.coverImage || !trip.availability.length) {
    throw new AppError("Complete trip details, cover image and at least one availability date are required", 422, missing);
  }
  
  if (trip.expiresAt && trip.expiresAt <= new Date()) {
    throw new AppError("Trip end dates must be in the future to submit", 400);
  }

  const passedModeration = runAutomatedModeration(trip);
  if (!passedModeration) {
    trip.status = "REJECTED";
    trip.rejectionReason = "Automated moderation flagged this content as inappropriate.";
    await trip.save();
    return sendSuccess(res, 200, "Post rejected by automated moderation", { trip });
  }

  trip.status = "PENDING_APPROVAL";
  trip.rejectionReason = undefined;
  await trip.save();
  sendSuccess(res, 200, "Post submitted for admin approval", { trip });
});

export const viewTrip = catchAsync(async (req, res) => {
  // Simple increment, assuming rate-limiting is applied via middleware
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, status: "PUBLISHED", isDeleted: false },
    { $inc: { viewCount: 1 } },
    { new: true }
  );
  if (!trip) throw new AppError("Post not found", 404);
  sendSuccess(res, 200, "View recorded", { viewCount: trip.viewCount });
});