import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    response: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["NEW", "READ", "RESPONDED", "CLOSED"], default: "NEW" },
  },
  { timestamps: true },
);

inquirySchema.index({ seller: 1, status: 1 });
export default mongoose.model("Inquiry", inquirySchema);