import crypto from "crypto";
import jwt from "jsonwebtoken";

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), tokenVersion: user.tokenVersion, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" },
  );

export const createRandomToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
export { signAccessToken, signRefreshToken };