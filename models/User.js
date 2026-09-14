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
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
export default mongoose.model("User", userSchema);