import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true }, // We reference Trip (which is acts as Post)
    tripDateId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedDepartureDate: { type: Date, required: true },
    selectedReturnDate: { type: Date, required: true },
    travelers: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    status: { type: String, enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REJECTED"], default: "PENDING" },
    paymentStatus: { type: String, enum: ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"], default: "UNPAID" },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ postId: 1, status: 1 });
export default mongoose.model("Booking", bookingSchema);