import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/response.js";

// POST /api/v1/users/:userId/block — Block a user
export const blockUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    throw new AppError("You cannot block yourself", 400);
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new AppError("User not found", 404);
  }

  // Check if already blocked
  const alreadyBlocked = req.user.blockedUsers?.some(
    (id) => id.toString() === userId,
  );
  if (alreadyBlocked) {
    throw new AppError("User is already blocked", 409);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { blockedUsers: userId },
  });

  sendSuccess(res, 200, "User blocked successfully");
});

// DELETE /api/v1/users/:userId/block — Unblock a user
export const unblockUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const wasBlocked = req.user.blockedUsers?.some(
    (id) => id.toString() === userId,
  );
  if (!wasBlocked) {
    throw new AppError("User is not in your block list", 404);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { blockedUsers: userId },
  });

  sendSuccess(res, 200, "User unblocked successfully");
});

// GET /api/v1/users/blocked — List all blocked users
export const getBlockedUsers = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("blockedUsers", "_id name email role status");

  sendSuccess(res, 200, "Blocked users fetched successfully", {
    blockedUsers: user.blockedUsers || [],
  });
});
