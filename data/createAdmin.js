import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "../configs/db.js";
import User from "../models/User.js";

// "email": "admin@example.com",
// "password": "Admin123!"

const email = process.env.ADMIN_EMAIL || "muhammedaliashfaq@gmail.com";
const password = process.env.ADMIN_PASSWORD || "123456";
const name = process.env.ADMIN_NAME || "Muhammad Ali Ashfaq";

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
  console.log(`Admin ready: ${user.email} (Role: ${user.role}, Status: ${user.status})`);
} catch (error) {
  console.error("Admin creation failed:", error.message);
  process.exitCode = 1;
} finally {
  process.exit();
}
