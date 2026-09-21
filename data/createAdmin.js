import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../configs/db.js";
import User from "../models/User.js";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Admin";

if (!password) {
  throw new Error("ADMIN_PASSWORD must be set before running the admin seed");
}

if (
  password.length < 12 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/\d/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error(
    "ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol",
  );
}

try {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(
    `Admin ready: ${user.email} (Role: ${user.role}, Status: ${user.status})`,
  );
} catch (error) {
  console.error("Admin creation failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
