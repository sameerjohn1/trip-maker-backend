import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const createBooking = catchAsync(async (req, res) => {
  const tripId = req.params.tripId || req.body.postId;
  const { tripDateId, travelers } = req.body || {};
  const postId = tripId;
  if (!postId || !tripDateId || !travelers) {
    throw new AppError("postId, tripDateId, and travelers are required", 400);
  }

  const trip = await Trip.findOne({ _id: postId, isDeleted: false, status: "PUBLISHED" });
  if (!trip) throw new AppError("Public post not found", 404);

  const availability = trip.availability.find(a => a._id.toString() === tripDateId);
  if (!availability) throw new AppError("Selected availability date not found", 404);

  if (availability.availableSeats < travelers) {
    throw new AppError("Not enough available seats", 409);
  }

  const existingBooking = await Booking.findOne({ userId: req.user._id, postId: trip._id, tripDateId });
  if (existingBooking && existingBooking.status !== "CANCELLED") {
    throw new AppError("You already have an active booking for this date", 409);
  }

  const amount = trip.price * travelers; // Simplified

  const booking = await Booking.create({
    userId: req.user._id,
    postId: trip._id,
    tripDateId,
    selectedDepartureDate: availability.departureDate,
    selectedReturnDate: availability.returnDate,
    travelers,
    amount,
    currency: trip.currency,
  });

  // Update trip stats (simplification, real system would verify payment first)
  availability.availableSeats -= travelers;
  trip.bookingCount += 1;
  trip.sales += 1;
  trip.revenue += amount;
  await trip.save();

  sendSuccess(res, 201, "Booking created successfully", { booking });
});

export const listBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  // User can see bookings they made OR bookings on their posts
  const tripsOwned = await Trip.find({ ownerId: req.user._id }).select('_id');
  const tripIds = tripsOwned.map(t => t._id);

  const filter = {
    $or: [
      { userId: req.user._id },
      { postId: { $in: tripIds } }
    ]
  };

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("postId", "title coverImage")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Bookings fetched successfully", { items: bookings }, makePagination(page, limit, total));
});

export const getBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("postId", "title coverImage ownerId")
    .populate("userId", "name email");

  if (!booking) throw new AppError("Booking not found", 404);

  // Check ownership
  const isTraveler = booking.userId._id.toString() === req.user._id.toString();
  const isOwner = booking.postId.ownerId.toString() === req.user._id.toString();
  if (!isTraveler && !isOwner) {
    throw new AppError("Not authorized to view this booking", 403);
  }

  sendSuccess(res, 200, "Booking fetched successfully", { booking });
});

export const getOwnedBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const tripsOwned = await Trip.find({ ownerId: req.user._id }).select('_id');
  const tripIds = tripsOwned.map(t => t._id);

  const filter = { postId: { $in: tripIds } };

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("postId", "title coverImage")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Owned bookings fetched successfully", { items: bookings }, makePagination(page, limit, total));
});

export const updateOwnedBooking = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!status || !["CONFIRMED", "REJECTED", "CANCELLED"].includes(status)) {
    throw new AppError("Invalid status. Must be CONFIRMED, REJECTED, or CANCELLED", 400);
  }

  const booking = await Booking.findById(req.params.bookingId).populate("postId");
  if (!booking) throw new AppError("Booking not found", 404);

  if (booking.postId.ownerId.toString() !== req.user._id.toString()) {
    throw new AppError("Not authorized to update this booking", 403);
  }

  // Update status
  booking.status = status;
  await booking.save();

  sendSuccess(res, 200, "Booking updated successfully", { booking });
});