import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const itinerarySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    location: { type: String, trim: true, maxlength: 150 },
    activities: [{ type: String, trim: true, maxlength: 200 }],
    accommodation: { type: String, trim: true, maxlength: 300 },
    meals: [{ type: String, trim: true, maxlength: 100 }],
  },
  { _id: true },
);

const tripSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    fullDescription: { type: String, required: true, trim: true, maxlength: 5000 },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    tripType: { type: String, required: true, trim: true, maxlength: 60 },
    duration: { type: Number, required: true, min: 1, max: 365 },
    numberOfNights: { type: Number, required: true, min: 0, max: 364 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, minlength: 3, maxlength: 3 },
    discountPrice: { type: Number, min: 0 },
    depositAmount: { type: Number, min: 0, default: 0 },
    minimumGroupSize: { type: Number, min: 1, default: 1 },
    availability: { type: [availabilitySchema], default: [] },
    highlights: [{ type: String, trim: true, maxlength: 200 }],
    includedServices: [{ type: String, trim: true, maxlength: 200 }],
    excludedServices: [{ type: String, trim: true, maxlength: 200 }],
    requirements: { type: String, trim: true, maxlength: 2000 },
    cancellationPolicy: { type: String, trim: true, maxlength: 2000 },
    itinerary: { type: [itinerarySchema], default: [] },
    coverImage: { type: String, trim: true },
    galleryImages: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    requiredChanges: { type: String, trim: true, maxlength: 2000 },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

tripSchema.index({ title: "text", shortDescription: "text", fullDescription: "text", city: "text", country: "text", category: "text" });
export default mongoose.model("Trip", tripSchema);