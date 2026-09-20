import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Authentication token is required", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (error) {
    return next(
      new AppError(
        error.name === "TokenExpiredError"
          ? "Access token expired"
          : "Invalid authentication token",
        401,
      ),
    );
  }

  if (decoded.type !== "access") return next(new AppError("Invalid access token", 401));
  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User account no longer exists", 401));
  if (user.status !== "ACTIVE") {
    return next(new AppError(`Account is ${user.status.toLowerCase()}`, 403));
  }
  if (decoded.tokenVersion !== user.tokenVersion) {
    return next(new AppError("Session is no longer valid; please log in again", 401));
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  next();
};

// Seller-only routes use this explicit guard so a route cannot accidentally
// treat a traveler or administrator as a seller.
export const requireSellerActive = (req, res, next) => {
  if (!req.user || req.user.role !== "SELLER" || req.user.status !== "ACTIVE") {
    return next(new AppError("An active seller account is required", 403));
  }
  next();
};
