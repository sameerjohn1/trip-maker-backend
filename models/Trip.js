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
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 5000 },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
    country: { type: String, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 100 },
    duration: { type: Number, min: 1, max: 365 },
    numberOfNights: { type: Number, min: 0, max: 364 },
    price: { type: Number, min: 0, default: 0 },
    currency: { type: String, enum: ["PKR", "USD"], default: "PKR" },
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
      enum: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "EXPIRED"],
      default: "DRAFT",
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    expiresAt: { type: Date, index: true },
    
    // Analytics & Interactions
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

tripSchema.index({ title: "text", description: "text", city: "text", country: "text" });
tripSchema.index({ status: 1, expiresAt: 1 });
tripSchema.index({ ownerId: 1, status: 1 });

export default mongoose.model("Trip", tripSchema);