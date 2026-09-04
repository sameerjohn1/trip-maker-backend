import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { makePagination, paginationOptions } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

const restoreSeats = (booking) =>
  Trip.updateOne(
    { _id: booking.trip, "availability._id": booking.tripDateId },
    { $inc: { "availability.$.availableSeats": booking.travelers } },
  );

export const createBooking = catchAsync(async (req, res) => {
  const travelers = Number(req.body?.travelers);
  const { tripDateId } = req.body || {};
  if (!tripDateId || !Number.isInteger(travelers) || travelers < 1) {
    throw new AppError("tripDateId and a positive integer travelers value are required", 400);
  }

  const trip = await Trip.findOne({
    _id: req.params.tripId,
    isDeleted: false,
    status: { $in: ["PUBLISHED", "APPROVED"] },
    "availability._id": tripDateId,
  });
  if (!trip) throw new AppError("Public trip or selected departure date not found", 404);
  const selectedDate = trip.availability.id(tripDateId);
  if (!selectedDate) throw new AppError("Selected departure date not found", 404);

  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: trip._id, "availability._id": tripDateId, "availability.availableSeats": { $gte: travelers } },
    { $inc: { "availability.$.availableSeats": -travelers } },
    { new: true },
  );
  if (!updatedTrip) throw new AppError("Not enough available seats", 409);

  try {
    const booking = await Booking.create({
      traveler: req.user._id,
      seller: trip.seller,
      trip: trip._id,
      tripDateId,
      selectedDepartureDate: selectedDate.departureDate,
      selectedReturnDate: selectedDate.returnDate,
      travelers,
      totalPrice: (trip.discountPrice ?? trip.price) * travelers,
      currency: trip.currency,
      paymentStatus: "UNPAID",
    });
    sendSuccess(res, 201, "Booking created successfully; payment is not enabled yet", { booking });
  } catch (error) {
    await Trip.updateOne({ _id: trip._id, "availability._id": tripDateId }, { $inc: { "availability.$.availableSeats": travelers } });
    throw error;
  }
});

export const listTravelerBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { traveler: req.user._id };
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate("trip", "title coverImage city country").populate("seller", "name sellerProfile.agencyName")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Bookings fetched successfully", { bookings }, makePagination(page, limit, total));
});

export const getTravelerBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, traveler: req.user._id })
    .populate("trip").populate("seller", "name email sellerProfile");
  if (!booking) throw new AppError("Booking not found", 404);
  sendSuccess(res, 200, "Booking fetched successfully", { booking });
});

export const cancelTravelerBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, traveler: req.user._id });
  if (!booking) throw new AppError("Booking not found", 404);
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) throw new AppError("This booking cannot be cancelled", 400);
  booking.status = "CANCELLED";
  booking.cancellationReason = req.body?.reason || "Cancelled by traveler";
  await booking.save();
  await restoreSeats(booking);
  sendSuccess(res, 200, "Booking cancelled successfully", { booking });
});

export const listSellerBookings = catchAsync(async (req, res) => {
  const { page, limit } = paginationOptions(req);
  const filter = { seller: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [bookings, total] = await Promise.all([
    Booking.find(filter).populate("trip", "title coverImage city country").populate("traveler", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Seller bookings fetched successfully", { bookings }, makePagination(page, limit, total));
});

export const getSellerBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, seller: req.user._id })
    .populate("trip").populate("traveler", "name email");
  if (!booking) throw new AppError("Booking not found", 404);
  sendSuccess(res, 200, "Booking fetched successfully", { booking });
});

export const updateSellerBooking = catchAsync(async (req, res) => {
  const { status } = req.body || {};
  if (!["CONFIRMED", "REJECTED", "COMPLETED"].includes(status)) throw new AppError("Invalid seller booking status", 400);
  const booking = await Booking.findOne({ _id: req.params.id, seller: req.user._id });
  if (!booking) throw new AppError("Booking not found", 404);
  if (booking.status === "CANCELLED") throw new AppError("Cancelled booking cannot be changed", 400);
  if (status === "COMPLETED" && booking.status !== "CONFIRMED") throw new AppError("Only confirmed bookings can be completed", 400);
  booking.status = status;
  await booking.save();
  if (status === "REJECTED") await restoreSeats(booking);
  sendSuccess(res, 200, "Booking status updated successfully", { booking });
});