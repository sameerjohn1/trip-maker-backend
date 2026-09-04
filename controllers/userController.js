import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

export const getProfile = catchAsync(async (req, res) => {
  sendSuccess(res, 200, "Profile fetched successfully", { user: publicUser(req.user) });
});

export const updateProfile = catchAsync(async (req, res) => {
  const allowed = ["name"];
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (updates.name !== undefined && (typeof updates.name !== "string" || updates.name.trim().length < 2)) {
    throw new AppError("Name must be at least 2 characters long", 400);
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  sendSuccess(res, 200, "Profile updated successfully", { user: publicUser(user) });
});

export const deactivateAccount = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { status: "DEACTIVATED", $inc: { tokenVersion: 1 } });
  sendSuccess(res, 200, "Account deactivated successfully");
});