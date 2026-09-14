import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import {
  createRandomToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
} from "../utils/token.js";
import { publicUser } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";

const emailPattern = /^\S+@\S+\.\S+$/;

const authPayload = (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user),
  user: publicUser(user),
});

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    throw new AppError("Name, email and password are required", 400);
  if (!emailPattern.test(String(email).trim()))
    throw new AppError("Please provide a valid email address", 400);
  if (typeof password !== "string" || password.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  
  if (await User.exists({ email: normalizedEmail }))
    throw new AppError("A user with this email already exists", 409);

  const verificationToken = createRandomToken();
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    role: "USER",
    status: "ACTIVE",
    verificationTokenHash: hashToken(verificationToken),
    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const data = { user: publicUser(user) };
  if (process.env.NODE_ENV !== "production")
    data.verificationToken = verificationToken;
  sendSuccess(res, 201, "Registration successful", data);
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    throw new AppError("Email and password are required", 400);
  const user = await User.findOne({
    email: String(email).trim().toLowerCase(),
  }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(`Account is ${user.status.toLowerCase()}`, 403);
  }
  if (
    process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
    !user.emailVerified
  ) {
    throw new AppError("Please verify your email before logging in", 403);
  }
  sendSuccess(res, 200, "Login successful", authPayload(user));
});

export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body || {};
  if (!token) throw new AppError("Refresh token is required", 400);
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "refresh")
    throw new AppError("Invalid refresh token", 401);
  const user = await User.findById(decoded.id);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    user.tokenVersion !== decoded.tokenVersion
  ) {
    throw new AppError("Refresh token is no longer valid", 401);
  }
  sendSuccess(res, 200, "Token refreshed successfully", {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: publicUser(user),
  });
});

export const logout = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  sendSuccess(res, 200, "Logout successful");
});

export const getMe = catchAsync(async (req, res) => {
  sendSuccess(res, 200, "Current user fetched successfully", {
    user: publicUser(req.user),
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body || {};
  if (!token) throw new AppError("Verification token is required", 400);
  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationExpires: { $gt: new Date() },
  });
  if (!user)
    throw new AppError("Verification token is invalid or expired", 400);
  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpires = undefined;
  await user.save();
  sendSuccess(res, 200, "Email verified successfully", {
    user: publicUser(user),
  });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  if (!emailPattern.test(email))
    throw new AppError("Please provide a valid email address", 400);
  const user = await User.findOne({ email });
  const data = {};
  if (user) {
    const token = createRandomToken();
    user.resetPasswordTokenHash = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    if (process.env.NODE_ENV !== "production") data.resetToken = token;
    console.log(`[password reset token for ${email}] ${token}`);
  }
  sendSuccess(
    res,
    200,
    "If an account exists, password reset instructions have been generated",
    data,
  );
});

export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || typeof password !== "string" || password.length < 6) {
    throw new AppError(
      "A valid token and password of at least 6 characters are required",
      400,
    );
  }
  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+password");
  if (!user) throw new AppError("Reset token is invalid or expired", 400);
  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion += 1;
  await user.save();
  sendSuccess(res, 200, "Password reset successfully");
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (
    !currentPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 6
  ) {
    throw new AppError(
      "Current password and a new password of at least 6 characters are required",
      400,
    );
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(currentPassword, user.password)))
    throw new AppError("Current password is incorrect", 401);
  user.password = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  await user.save();
  sendSuccess(res, 200, "Password changed successfully");
});
