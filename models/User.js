import mongoose from "mongoose";

const sellerProfileSchema = new mongoose.Schema(
  {
    agencyName: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },
    verificationStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"],
      default: "NOT_SUBMITTED",
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    documents: [
      {
        url: String,
        originalName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["TRAVELER", "SELLER", "ADMIN"], default: "TRAVELER" },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "DEACTIVATED"],
      default: "ACTIVE",
    },
    emailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    verificationTokenHash: String,
    verificationExpires: Date,
    resetPasswordTokenHash: String,
    resetPasswordExpires: Date,
    sellerProfile: { type: sellerProfileSchema, default: undefined },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
export default mongoose.model("User", userSchema);