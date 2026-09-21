import mongoose from "mongoose";

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
    // The application has two account types only. Trip ownership is determined
    // by ownerId, not by a separate seller role.
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "BANNED"],
      default: "ACTIVE",
    },
    emailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    verificationTokenHash: String,
    verificationExpires: Date,
    resetPasswordTokenHash: String,
    resetPasswordExpires: Date,
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    phone: { type: String, trim: true, maxlength: 50 },
    profilePhoto: { type: String, trim: true, maxlength: 2000 },
    showPhoneInPost: { type: Boolean, default: false },
    sellerProfile: {
      agencyName: { type: String, trim: true, maxlength: 150 },
      description: { type: String, trim: true, maxlength: 2000 },
      phone: { type: String, trim: true, maxlength: 50 },
      address: { type: String, trim: true, maxlength: 300 },
      verificationStatus: { type: String, enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"], default: "NOT_SUBMITTED" },
      documents: [{ url: String, originalName: String }],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

userSchema.index({ role: 1, status: 1 });
export default mongoose.model("User", userSchema);
