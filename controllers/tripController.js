import Trip from "../models/Trip.js";
import Favorite from "../models/Favorite.js";
import Booking from "../models/Booking.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions, parseJsonField, removeFile } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

const arrayFields = ["availability", "highlights", "includedServices", "excludedServices", "itinerary"];
const payloadFromRequest = (req) => {
  const body = { ...(req.body || {}) };
  for (const field of arrayFields) if (body[field] !== undefined) body[field] = parseJsonField(body[field], []);
  for (const field of ["duration", "numberOfNights", "price", "discountPrice", "depositAmount", "minimumGroupSize"]) {
    if (body[field] !== undefined && body[field] !== "") body[field] = Number(body[field]);
  }
  const files = req.files || {};
  if (files.coverImage?.[0]) body.coverImage = `/uploads/${files.coverImage[0].filename}`;
  if (files.galleryImages?.length) body.galleryImages = files.galleryImages.map((file) => `/uploads/${file.filename}`);
  return body;
};

const validatePrice = (body) => {
  if (body.discountPrice !== undefined && body.discountPrice > body.price) {
    throw new AppError("Discount price cannot be greater than the original price", 400);
  }
  if (body.availability !== undefined) {
    if (!Array.isArray(body.availability)) throw new AppError("availability must be an array", 400);
    body.availability = body.availability.map((date) => ({
      ...date,
      departureDate: new Date(date.departureDate),
      returnDate: new Date(date.returnDate),
      totalSeats: Number(date.totalSeats),
      availableSeats: date.availableSeats === undefined ? Number(date.totalSeats) : Number(date.availableSeats),
    }));
    body.availability.forEach((date) => {
      if (Number.isNaN(date.departureDate.getTime()) || Number.isNaN(date.returnDate.getTime()) ||
          date.returnDate < date.departureDate || !Number.isInteger(date.totalSeats) || date.totalSeats < 1 ||
          !Number.isInteger(date.availableSeats) || date.availableSeats < 0 || date.availableSeats > date.totalSeats) {
        throw new AppError("Each availability date must contain valid dates and seat counts", 400);
      }
    });
  }
};

const publicFilter = (req) => {
  const filter = { isDeleted: false, status: { $in: ["PUBLISHED", "APPROVED"] } };
  const q = req.query;
  if (q.search) {
    const regex = new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: regex }, { country: regex }, { city: regex }, { category: regex }, { tripType: regex }];
  }
  for (const key of ["country", "city", "category", "tripType"]) if (q[key]) filter[key] = q[key];
  if (q.destination) filter.destination = q.destination;
  if (q.seller) filter.seller = q.seller;
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
  duration: { duration: 1 },
  popular: { createdAt: -1 },
};

export const listPublicTrips = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = publicFilter(req);
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("destination", "name country region imageUrl").populate("seller", "name sellerProfile.agencyName")
      .sort(tripSort[req.query.sort] || tripSort.newest).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Trips fetched successfully", { trips }, makePagination(page, limit, total));
});

export const getPublicTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, ...publicFilter(req) })
    .populate("destination").populate("seller", "name email sellerProfile");
  if (!trip) throw new AppError("Trip not found", 404);
  sendSuccess(res, 200, "Trip fetched successfully", { trip });
});

export const listSellerTrips = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { seller: req.user._id, isDeleted: false };
  if (req.query.status) filter.status = req.query.status;
  const [trips, total] = await Promise.all([
    Trip.find(filter).populate("destination", "name country").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Trip.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Seller trips fetched successfully", { trips }, makePagination(page, limit, total));
});

export const getSellerTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, seller: req.user._id, isDeleted: false }).populate("destination");
  if (!trip) throw new AppError("Trip not found", 404);
  sendSuccess(res, 200, "Trip fetched successfully", { trip });
});

export const createTrip = catchAsync(async (req, res) => {
  const body = payloadFromRequest(req);
  validatePrice(body);
  const trip = await Trip.create({ ...body, seller: req.user._id, status: "DRAFT" });
  sendSuccess(res, 201, "Trip draft created successfully", { trip });
});

export const updateTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, seller: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Trip not found", 404);
  const body = payloadFromRequest(req);
  validatePrice(body);
  delete body.status;
  delete body.seller;
  const importantFields = ["price", "discountPrice", "destination", "availability", "itinerary", "country", "city"];
  const needsApproval = ["APPROVED", "PUBLISHED"].includes(trip.status) &&
    importantFields.some((field) => body[field] !== undefined);
  if (needsApproval) {
    body.status = "PENDING_APPROVAL";
    body.rejectionReason = undefined;
    body.requiredChanges = undefined;
  }
  Object.assign(trip, body);
  await trip.save();
  sendSuccess(res, 200, needsApproval ? "Trip updated and sent for re-approval" : "Trip updated successfully", { trip });
});

export const deleteTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, seller: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Trip not found", 404);
  const confirmed = await Booking.exists({ trip: trip._id, status: { $in: ["CONFIRMED", "COMPLETED"] } });
  if (confirmed) {
    trip.status = "ARCHIVED";
    trip.isDeleted = true;
    await trip.save();
    return sendSuccess(res, 200, "Trip archived because it has confirmed bookings");
  }
  trip.isDeleted = true;
  trip.status = "ARCHIVED";
  await trip.save();
  [...(trip.galleryImages || []), trip.coverImage].forEach(removeFile);
  await Favorite.deleteMany({ trip: trip._id });
  sendSuccess(res, 200, "Trip deleted successfully");
});

export const submitTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, seller: req.user._id, isDeleted: false });
  if (!trip) throw new AppError("Trip not found", 404);
  if (!["DRAFT", "REJECTED"].includes(trip.status)) throw new AppError("Only draft or rejected trips can be submitted", 400);
  const required = ["title", "shortDescription", "fullDescription", "destination", "country", "city", "category", "tripType", "price"];
  const missing = required.filter((field) => !trip[field] && trip[field] !== 0);
  if (missing.length || !trip.coverImage || !trip.availability.length) {
    throw new AppError("Complete trip details, cover image and at least one availability date are required", 422, missing);
  }
  trip.status = "PENDING_APPROVAL";
  trip.rejectionReason = undefined;
  trip.requiredChanges = undefined;
  await trip.save();
  sendSuccess(res, 200, "Trip submitted for admin approval", { trip });
});